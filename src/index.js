import { Hono } from "hono/tiny";
import { getPageHtml } from "./page.js";
import { parseCoords, gcj02ToWgs84, toWgs84, round6, inRange } from "./parse.js";

const app = new Hono();


app.get("/wloc.js", async (c)=>{

  const res = await fetch(
    "https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/main/dist/wloc.js"
  );

  const text = await res.text();

  c.header(
    "Content-Type",
    "application/javascript"
  );

  return c.text(text);

});


app.get("/wloc-settings.js", async (c)=>{

  const res = await fetch(
    "https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/main/dist/wloc-settings.js"
  );

  const text = await res.text();

  c.header(
    "Content-Type",
    "application/javascript"
  );

  return c.text(text);

});




app.get("/", (c) => {
  return c.html(getPageHtml());
});


app.get("/api/parse", async (c) => {
  const raw = c.req.query("u") || "";
  const cs = (c.req.query("cs") || "").toLowerCase();
  const fmt = (c.req.query("format") || "").toLowerCase();

  try {

    let { lat, lon, name, src } = await parseCoords(raw);


    if (cs === "gcj") {
      ({ lat, lon } = gcj02ToWgs84(lat, lon));
    } 
    else if (cs === "bd") {
      ({ lat, lon } = toWgs84(lat, lon, "baidu"));
    } 
    else if (cs !== "none") {
      ({ lat, lon } = toWgs84(lat, lon, src));
    }


    if (!inRange(lat, lon)) {
      throw new Error("解析出的坐标超出合法范围");
    }


    lat = round6(lat);
    lon = round6(lon);

    name = name || "";


    c.header(
      "Access-Control-Allow-Origin",
      "*"
    );


    if (fmt === "json") {
      return c.json({
        lat,
        lon,
        name
      });
    }


    return c.text(
      `lat=${lat}&lon=${lon}`
    );


  } catch (e) {

    c.header(
      "Access-Control-Allow-Origin",
      "*"
    );


    return c.json(
      {
        error:String(
          e && e.message ? e.message : e
        )
      },
      422
    );

  }

});


app.onError((e,c)=>{

  c.header(
    "Access-Control-Allow-Origin",
    "*"
  );

  return c.text(
    e.message || e,
    500
  );

});


export default app;
