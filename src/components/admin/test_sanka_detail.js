// test detail
const DONGHUA_API_BASE = "https://www.sankavollerei.web.id/anime/donghua";

async function test() {
  try {
    const res = await fetch(`${DONGHUA_API_BASE}/detail/the-great-ruler-3d`);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2).slice(0, 1500));
  } catch (err) {
    console.error(err);
  }
}
test();
