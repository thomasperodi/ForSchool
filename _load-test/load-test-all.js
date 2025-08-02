// import http from "k6/http";
// import { check, sleep } from "k6";

// export const options = {
//   vus: 50,          // Utenti simultanei
//   duration: "20s",  // Durata del test
// };

// const BASE_URL = "http://localhost:3000/api"; // Cambia con la tua URL su Vercel se vuoi test prod

// export default function () {
//   const headers = {
//     "Content-Type": "application/json",
//   };

//   // --- GET ---
//   check(http.get(`${BASE_URL}/scuole?domain=isii.it`, { headers }), { "GET scuole ok": (r) => r.status === 200 });
//   check(http.get(`${BASE_URL}/dashboard-stats`, { headers }), { "GET dashboard-stats ok": (r) => r.status === 200 });
//   check(http.get(`${BASE_URL}/revenue-stats?year=2025&month=07`, { headers }), { "GET revenue-stats ok": (r) => r.status === 200 });

//   // --- POST findOrCreateScuola ---
//   const scuolaPayload = JSON.stringify({ domain: "isii.it" });
//   check(http.post(`${BASE_URL}/findOrCreateScuola`, scuolaPayload, { headers }), { "POST scuola ok": (r) => r.status === 200 });

//   // --- POST Stripe checkout ---
//   const paymentPayload = JSON.stringify({
//     amount: 5000,
//     currency: "eur",
//     token: "tok_visa", // Carta test di Stripe
//   });

//   ["checkout", "checkout-abbonamenti", "checkout-ripetizione"].forEach((endpoint) => {
//     check(http.post(`${BASE_URL}/${endpoint}`, paymentPayload, { headers }), {
//       [`POST ${endpoint} ok`]: (r) => r.status === 200,
//     });
//   });

//   // --- POST updateStatusOrder ---
//   const orderPayload = JSON.stringify({ order_id: 123, status: "completed", is_test: true });
//   check(http.post(`${BASE_URL}/updateStatusOrder`, orderPayload, { headers }), { "POST updateStatusOrder ok": (r) => r.status === 200 });

//   // --- POST Stripe Connect ---
//   const connectPayload = JSON.stringify({ email: "test@example.com" });
//   check(http.post(`${BASE_URL}/stripe-create-account`, connectPayload, { headers }), { "POST stripe-create-account ok": (r) => r.status === 200 });

//   // Sleep 1 second to simulare un utente reale
//   sleep(1);
// }


import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 7000, // utenti virtuali simultanei
  duration: '1m', // durata del test
};

export default function () {
  http.get('https://for-school-tau.vercel.app/');
  sleep(1);
}
