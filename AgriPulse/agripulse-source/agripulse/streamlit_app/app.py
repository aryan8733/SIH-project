"""
AgriPulse — Streamlit build
SIH26132: Strengthening Market Linkages and Price Discovery for Farmers

Deploy on Streamlit Community Cloud:
  1. Push this folder to a public GitHub repo (keep app.py, engine.py,
     demo_data.py, requirements.txt, .streamlit/ together in one folder).
  2. https://share.streamlit.io -> New app -> pick the repo ->
     main file path: streamlit_app/app.py (or app.py if this is the repo root).
  3. Deploy. No database, no API keys, no secrets needed.

Run locally:
  pip install -r requirements.txt
  streamlit run app.py
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from datetime import date, timedelta

from engine import (
    Settings, CROPS, CROP_BY_CODE, suggest_vehicle,
    rank_markets, match_buyers, forecast, sell_now_or_wait, net_return,
)
from demo_data import MARKETS, FARMERS, BUYERS, markets_for_crop

st.set_page_config(page_title="AgriPulse — SIH26132", page_icon="🌾", layout="wide")

# --------------------------------------------------------------------------
# i18n
# --------------------------------------------------------------------------
I18N = {
    "en": {"where": "Where to sell", "whom": "Who to sell to", "when": "When to sell",
           "how": "How much you keep", "qty": "Quantity (quintal)", "grade": "Grade",
           "crop": "Crop", "net": "Net return", "market": "Market", "distance": "Distance",
           "transport": "Transport", "demand": "Demand", "accept": "Accept", "reject": "Reject",
           "sell_now": "Sell now", "wait": "Wait a week"},
    "hi": {"where": "कहाँ बेचें", "whom": "किसे बेचें", "when": "कब बेचें",
           "how": "कितना मिलेगा", "qty": "मात्रा (क्विंटल)", "grade": "ग्रेड",
           "crop": "फसल", "net": "शुद्ध लाभ", "market": "मंडी", "distance": "दूरी",
           "transport": "भाड़ा", "demand": "माँग", "accept": "स्वीकार", "reject": "अस्वीकार",
           "sell_now": "अभी बेचें", "wait": "एक सप्ताह रुकें"},
    "mr": {"where": "कुठे विकावे", "whom": "कोणाला विकावे", "when": "कधी विकावे",
           "how": "किती मिळेल", "qty": "प्रमाण (क्विंटल)", "grade": "प्रत",
           "crop": "पीक", "net": "निव्वळ परतावा", "market": "बाजार", "distance": "अंतर",
           "transport": "वाहतूक", "demand": "मागणी", "accept": "स्वीकारा", "reject": "नाकारा",
           "sell_now": "आता विका", "wait": "एक आठवडा थांबा"},
}


def t(key: str) -> str:
    return I18N.get(st.session_state.lang, I18N["en"]).get(key, key)


def crop_label(code: str) -> str:
    c = CROP_BY_CODE[code]
    return c.get(st.session_state.lang, c["en"])


def inr(n) -> str:
    try:
        return f"₹{round(n):,}"
    except Exception:
        return f"₹{n}"


# --------------------------------------------------------------------------
# session state — replaces the browser localStorage of the JS prototype
# --------------------------------------------------------------------------
def init_state():
    ss = st.session_state
    ss.setdefault("lang", "en")
    ss.setdefault("role", "Farmer")
    ss.setdefault("settings", Settings())
    ss.setdefault("crop", "soybean")
    ss.setdefault("qty", 10.0)
    ss.setdefault("grade", "A")
    ss.setdefault("origin_km", 8)          # distance of the farmer's village from the nearest listed mandi baseline
    ss.setdefault("lots", [
        {"id": "LOT-10245", "farmer": "Ramesh Patidar", "crop": "soybean", "qty": 10, "grade": "A",
         "place": "Bagli, Dewas", "ask": 4500, "status": "Available"},
        {"id": "LOT-10246", "farmer": "Sita Bai Yadav", "crop": "onion", "qty": 40, "grade": "B",
         "place": "Tonk Khurd", "ask": 1700, "status": "Available"},
        {"id": "LOT-10248", "farmer": "Anita Solanki", "crop": "soybean", "qty": 18, "grade": "A",
         "place": "Kannod", "ask": 4560, "status": "Available"},
    ])
    ss.setdefault("offers", [])
    ss.setdefault("txns", [])
    ss.setdefault("verified", {b["company"]: b["verified"] for b in BUYERS})


init_state()
S: Settings = st.session_state.settings

# --------------------------------------------------------------------------
# sidebar — role, language, lot inputs
# --------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### 🌾 AgriPulse")
    st.caption("SIH26132 — market linkage & price discovery")

    st.session_state.role = st.radio("Sign in as", ["Farmer", "Buyer", "Admin"],
                                      index=["Farmer", "Buyer", "Admin"].index(st.session_state.role))
    st.session_state.lang = st.selectbox("Language / भाषा", ["en", "hi", "mr"],
                                          format_func=lambda l: {"en": "English", "hi": "हिंदी", "mr": "मराठी"}[l],
                                          index=["en", "hi", "mr"].index(st.session_state.lang))
    st.divider()

    if st.session_state.role == "Farmer":
        st.markdown("**Your crop lot**")
        st.session_state.crop = st.selectbox(t("crop"), [c["code"] for c in CROPS],
                                              format_func=crop_label,
                                              index=[c["code"] for c in CROPS].index(st.session_state.crop))
        st.session_state.qty = st.number_input(t("qty"), min_value=1.0, max_value=1000.0,
                                                value=float(st.session_state.qty), step=1.0)
        st.session_state.grade = st.selectbox(t("grade"), ["A", "B", "C"],
                                               index=["A", "B", "C"].index(st.session_state.grade))
        st.caption("Demo village: Bagli, Dewas — distances below are from here to each mandi.")

    st.divider()
    st.caption("All prices, farmers and buyers are demo data seeded for this prototype.")

vehicle = suggest_vehicle(st.session_state.qty)

# ==========================================================================
# FARMER VIEW
# ==========================================================================
if st.session_state.role == "Farmer":
    st.title("Don't just show the price. Help the farmer decide.")
    st.caption("Where to sell · to whom · when · and how much lands in hand — for one real lot.")

    crop = st.session_state.crop
    qty = st.session_state.qty
    grade = st.session_state.grade

    market_rows = markets_for_crop(crop)
    ranked = rank_markets(market_rows, qty, grade, vehicle, S)
    best = ranked[0]
    fc = best["forecast"]
    timing = sell_now_or_wait(fc, qty, grade, best["km"], vehicle, S)
    buyers = match_buyers(BUYERS, crop, qty, grade, farmer_km=8, settings=S)
    top_buyer = buyers[0] if buyers else None

    # ---------------- the decision receipt ----------------
    st.subheader(f"{crop_label(crop)} · {qty:.0f} quintal · {grade} grade")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric(t("where"), best["district"])
    c2.metric(t("net") + "/qtl", inr(best["ledger"]["net_per_qtl"]))
    c3.metric("7-day forecast", f"{inr(fc['lo'])}–{inr(fc['hi'])}", f"{fc['change_pct']:+.1f}%")
    c4.metric(t("when"), t("wait") if timing["verdict"] == "wait" else t("sell_now"))

    with st.container(border=True):
        L = best["ledger"]
        st.markdown(f"**Sell at {best['name']}** ({best['district']}, {best['km']} km)")
        rows = [
            ("Modal price today", inr(L["modal_price"]) + "/qtl"),
            (f"Gross revenue · {qty:.0f} × {inr(L['effective_price'])}", inr(L["revenue"])),
            (f"Transport ({L['transport']['label']}, {L['transport']['trips']} trip(s))", "− " + inr(L["transport"]["total"])),
            ("Mandi fee", "− " + inr(L["mandi_fee"])),
            ("Commission", "− " + inr(L["commission"])),
            ("Labour + packing", "− " + inr(L["labour"] + L["packing"])),
        ]
        for label, val in rows:
            lc, rc = st.columns([3, 1])
            lc.write(label); rc.write(val)
        st.markdown("---")
        lc, rc = st.columns([3, 1])
        lc.markdown(f"**{t('how')}**")
        rc.markdown(f"**{inr(L['net'])}**")

        if top_buyer:
            st.info(
                f"Best matching buyer: **{top_buyer['company']}** — {top_buyer['score']}% match, "
                f"offers {inr(top_buyer['pay'])}/qtl"
                + (", verified" if top_buyer["verified"] else ", not verified")
            )
        st.caption(timing["reason"])

    st.markdown("#### Why not the highest price?")
    by_price = max(ranked, key=lambda r: r["today_price"])
    if by_price["district"] != best["district"]:
        diff = best["ledger"]["net"] - by_price["ledger"]["net"]
        st.warning(
            f"**{by_price['district']}** quotes the highest price "
            f"({inr(by_price['today_price'])}/qtl) but is {by_price['km']} km away. "
            f"After transport and mandi charges, **{best['district']}** leaves **{inr(diff)} more** in hand."
        )
    else:
        st.success(f"{best['district']} is both the highest price and the best net return here.")

    # ---------------- market comparison ----------------
    st.markdown("### Compare markets")
    df = pd.DataFrame([{
        "Market": r["district"], "Price/qtl": r["today_price"], "Distance (km)": r["km"],
        "Transport/qtl": r["ledger"]["transport"]["per_qtl"],
        "Demand": r["demand"], "Net/qtl": r["ledger"]["net_per_qtl"], "Total net": r["ledger"]["net"],
    } for r in ranked])
    st.dataframe(
        df.style.apply(lambda s: ["background-color:#E1EFE6" if s.name == 0 else "" for _ in s], axis=1),
        use_container_width=True, hide_index=True
    )
    fig = go.Figure()
    fig.add_bar(x=df["Market"][:7], y=df["Net/qtl"][:7], marker_color="#15624A", name="Net/qtl")
    fig.update_layout(height=320, margin=dict(t=10, b=10), yaxis_title="₹ per quintal",
                       title="Net return per quintal by mandi")
    st.plotly_chart(fig, use_container_width=True)

    # ---------------- forecast ----------------
    st.markdown("### Price forecast — " + best["district"])
    hist = best["history"]
    days_ahead = list(range(1, fc["days"] + 1))
    future_mid = [fc["current"] + (fc["point"] - fc["current"]) * i / fc["days"] for i in days_ahead]
    future_hi = [fc["current"] + (fc["hi"] - fc["current"]) * i / fc["days"] for i in days_ahead]
    future_lo = [fc["current"] + (fc["lo"] - fc["current"]) * i / fc["days"] for i in days_ahead]

    fig2 = go.Figure()
    x_hist = list(range(-len(hist) + 1, 1))
    fig2.add_scatter(x=x_hist, y=hist, mode="lines", name="History", line=dict(color="#2C6A9E"))
    x_fut = list(range(1, fc["days"] + 1))
    fig2.add_scatter(x=x_fut, y=future_hi, mode="lines", line=dict(width=0), showlegend=False)
    fig2.add_scatter(x=x_fut, y=future_lo, mode="lines", line=dict(width=0), fill="tonexty",
                      fillcolor="rgba(44,106,158,.18)", name="Forecast band")
    fig2.add_scatter(x=x_fut, y=future_mid, mode="lines", name="Forecast", line=dict(color="#2C6A9E", dash="dash"))
    fig2.update_layout(height=320, margin=dict(t=10, b=10), yaxis_title="₹ per quintal")
    st.plotly_chart(fig2, use_container_width=True)
    st.caption(f"Model fit R² = {fc['r2']:.2f} · slope {fc['slope']:+.1f}/day · "
               "Prediction is an estimate based on available data, not a guaranteed future price.")

    # ---------------- buyer matching ----------------
    st.markdown("### Matching buyers")
    for b in buyers[:5]:
        with st.container(border=True):
            bc1, bc2 = st.columns([3, 1])
            with bc1:
                badge = "✅ verified" if b["verified"] else "⚠️ unverified"
                st.markdown(f"**{b['company']}** — {b['person']} · {b['district']} · {badge}")
                st.progress(b["score"] / 100, text=f"{b['score']}% match")
                st.caption(f"Offers {inr(b['pay'])}/qtl · wants {b['qty_min']}–{b['qty_max']} qtl · {b['terms']}")
            with bc2:
                st.metric("Net/qtl", inr(b["ledger"]["net_per_qtl"]))

    # ---------------- publish a lot / manage offers ----------------
    st.markdown("### Publish this as a crop lot")
    with st.form("new_lot"):
        place = st.text_input("Pickup village", value="Bagli, Dewas")
        ask = st.number_input("Asking price (₹/qtl)", value=float(round(best["today_price"], -1)))
        submitted = st.form_submit_button("Publish lot")
        if submitted:
            new_id = f"LOT-{10260 + len(st.session_state.lots)}"
            st.session_state.lots.append({
                "id": new_id, "farmer": "Ramesh Patidar", "crop": crop, "qty": qty, "grade": grade,
                "place": place, "ask": ask, "status": "Available"
            })
            st.success(f"{new_id} published — buyers can now see it in the marketplace tab.")

    my_offers = [o for o in st.session_state.offers if o["lot_farmer"] == "Ramesh Patidar" and o["status"] == "Pending"]
    if my_offers:
        st.markdown("### Offers waiting for you")
        for o in my_offers:
            with st.container(border=True):
                oc1, oc2 = st.columns([3, 1])
                oc1.write(f"**{inr(o['price'])}/qtl** for {o['qty']} qtl on **{o['lot_id']}** from {o['buyer']}")
                a, r = oc2.columns(2)
                if a.button(t("accept"), key=f"acc_{o['id']}"):
                    o["status"] = "Completed"
                    for l in st.session_state.lots:
                        if l["id"] == o["lot_id"]:
                            l["status"] = "Sold"
                    st.session_state.txns.append({
                        "lot": o["lot_id"], "buyer": o["buyer"], "crop": crop,
                        "qty": o["qty"], "price": o["price"]
                    })
                    st.rerun()
                if r.button(t("reject"), key=f"rej_{o['id']}"):
                    o["status"] = "Rejected"
                    st.rerun()

# ==========================================================================
# BUYER VIEW
# ==========================================================================
elif st.session_state.role == "Buyer":
    st.title("Available crop lots")
    st.caption("Every lot published by a farmer, open for your offer.")

    crop_filter = st.selectbox("Filter by crop", ["All"] + [c["code"] for c in CROPS],
                                format_func=lambda x: "All crops" if x == "All" else crop_label(x))

    lots = [l for l in st.session_state.lots if l["status"] != "Sold"]
    if crop_filter != "All":
        lots = [l for l in lots if l["crop"] == crop_filter]

    for l in lots:
        with st.container(border=True):
            lc1, lc2 = st.columns([3, 1])
            with lc1:
                st.markdown(f"**{l['id']}** — {crop_label(l['crop'])} · {l['qty']} qtl · grade {l['grade']}")
                st.caption(f"{l['farmer']} · {l['place']} · asking {inr(l['ask'])}/qtl · status: {l['status']}")
            with lc2:
                with st.popover("Send offer"):
                    price = st.number_input("Your price (₹/qtl)", value=float(l["ask"]), key=f"p_{l['id']}")
                    qty_o = st.number_input("Quantity (qtl)", value=float(l["qty"]), max_value=float(l["qty"]), key=f"q_{l['id']}")
                    if st.button("Send", key=f"send_{l['id']}"):
                        st.session_state.offers.append({
                            "id": f"OF-{500 + len(st.session_state.offers)}", "lot_id": l["id"],
                            "lot_farmer": l["farmer"], "buyer": "Malwa Oil Mills",
                            "price": price, "qty": qty_o, "status": "Pending"
                        })
                        l["status"] = "Negotiation"
                        st.success("Offer sent.")
                        st.rerun()

    st.markdown("### Your offers")
    mine = [o for o in st.session_state.offers if o["buyer"] == "Malwa Oil Mills"]
    if mine:
        st.dataframe(pd.DataFrame(mine)[["id", "lot_id", "price", "qty", "status"]],
                     use_container_width=True, hide_index=True)
    else:
        st.caption("No offers sent yet.")

# ==========================================================================
# ADMIN VIEW
# ==========================================================================
else:
    st.title("Platform overview")

    total_value = sum(t["price"] * t["qty"] for t in st.session_state.txns)
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Farmers", len(FARMERS))
    k2.metric("Buyers", len(BUYERS))
    k3.metric("Open lots", sum(1 for l in st.session_state.lots if l["status"] == "Available"))
    k4.metric("Transaction value", inr(total_value))

    st.markdown("### Rates & settings — change these and every net-return number updates live")
    c1, c2, c3 = st.columns(3)
    with c1:
        S.transport_rate_per_km = st.number_input("Transport rate (₹/km)", value=float(S.transport_rate_per_km))
        S.mandi_fee_pct = st.number_input("Mandi fee (%)", value=float(S.mandi_fee_pct), step=0.1)
    with c2:
        S.commission_pct = st.number_input("Commission (%)", value=float(S.commission_pct), step=0.1)
        S.labour_per_qtl = st.number_input("Labour (₹/qtl)", value=float(S.labour_per_qtl))
    with c3:
        S.packing_per_qtl = st.number_input("Packing (₹/qtl)", value=float(S.packing_per_qtl))
        S.platform_fee_pct = st.number_input("Platform fee on buyer (%)", value=float(S.platform_fee_pct), step=0.1)
    S.charge_return_trip = st.checkbox("Charge return trip", value=S.charge_return_trip)
    st.session_state.settings = S

    st.markdown("### Effect right now — 10 qtl soybean, A grade, tractor trolley to Ujjain")
    demo = net_return(4451, 10, "A", 68, "tractor", S)
    st.write(f"Transport: {inr(demo['transport']['total'])} · **Net return: {inr(demo['net'])}**")

    st.markdown("### Buyer verification")
    for b in BUYERS:
        vc1, vc2 = st.columns([4, 1])
        vc1.write(f"**{b['company']}** — {b['district']} · rating {b['rating']}")
        cur = st.session_state.verified[b["company"]]
        if vc2.button("Revoke" if cur else "Verify", key=f"verify_{b['company']}"):
            st.session_state.verified[b["company"]] = not cur
            st.rerun()

    st.markdown("### Transactions")
    if st.session_state.txns:
        st.dataframe(pd.DataFrame(st.session_state.txns), use_container_width=True, hide_index=True)
    else:
        st.caption("No completed transactions yet in this session.")

st.divider()
st.caption("AgriPulse — SIH26132 prototype. Built for Smart India Hackathon 2026. All data shown is demo data.")
