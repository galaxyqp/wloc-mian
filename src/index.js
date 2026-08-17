import { Hono } from "hono/tiny";
import { getPageHtml } from "./page.js";
import { parseCoords, gcj02ToWgs84, toWgs84, round6, inRange } from "./parse.js";

const app = new Hono();


// ===============================
// WLOC 脚本代理
// ===============================

// 定位修改脚本
app.get("/wloc.js", async (c) => {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/galaxyqp/wloc-mian/blob/main/dist/wloc.js"
    );

    if (!response.ok) {
      return c.text("Failed to fetch wloc.js", 500);
    }

    return new Response(await response.text(), {
      headers: {
        "Content-Type": "application/javascript;charset=UTF-8",
        "Cache-Control": "public, max-age=3600",
      },
    });

  } catch (e) {
    return c.text(
      `wloc.js error: ${e.message || e}`,
      500
    );
  }
});


// 设置脚本
app.get("/wloc-settings.js", async (c) => {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/galaxyqp/wloc-mian/blob/main/dist/wloc-settings.js"
    );

    if (!response.ok) {
      return c.text("Failed to fetch wloc-settings.js", 500);
    }

    return new Response(await response.text(), {
      headers: {
        "Content-Type": "application/javascript;charset=UTF-8",
        "Cache-Control": "public, max-age=3600",
      },
    });

  } catch (e) {
    return c.text(
      `wloc-settings.js error: ${e.message || e}`,
      500
    );
  }
});


// ===============================
// WLOC 页面
// ===============================

app.get("/", (c) => {
  return c.html(getPageHtml());
});


// ===============================
// 地图链接解析 API
// ===============================

// GET /api/parse?u=<链接>&format=json&cs=<gcj|none>
//
// 返回:
// {lat, lon, name}
//
// 高德/苹果地图(中国大陆):
// GCJ-02 自动转换 WGS84
//
// cs=none:
// 强制不转换

app.get("/api/parse", async (c) => {

  const raw = c.req.query("u") || "";
  const cs = (c.req.query("cs") || "").toLowerCase();
  const fmt = (c.req.query("format") || "").toLowerCase();


  try {

    let { lat, lon, name, src } = await parseCoords(raw);


    // 坐标转换

    if (cs === "gcj") {

      ({ lat, lon } = gcj02ToWgs84(lat, lon));

    } else if (cs === "bd") {

      ({ lat, lon } = toWgs84(lat, lon, "baidu"));

    } else if (cs !== "none") {

      ({ lat, lon } = toWgs84(lat, lon, src));

    }


    // 合法范围检查

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
        error: String(
          e && e.message
            ? e.message
            : e
        )
      },
      422
    );

  }

});


// ===============================
// 错误处理
// ===============================

app.onError((e, c) => {

  c.header(
    "Access-Control-Allow-Origin",
    "*"
  );


  return c.text(
    `${e && e.message ? e.message : e}`,
    500
  );

});


export default app;
