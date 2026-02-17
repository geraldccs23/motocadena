const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json({ limit: "25mb" }));

const PORT = process.env.PORT || 3000;
const AGENT_TOKEN = process.env.AGENT_TOKEN || "";

function requireAuth(req, res, next) {
    const h = req.headers["authorization"] || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!AGENT_TOKEN || token !== AGENT_TOKEN) {
        return res.status(401).json({ error: "unauthorized" });
    }
    next();
}

const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

app.get("/api/agent/ping", async (_req, res) => {
    try {
        const r = await pool.query("select now() as now");
        res.json({ ok: true, now: r.rows[0].now });
    } catch (e) {
        res.status(500).json({ ok: false, error: String(e.message || e) });
    }
});

// Inserta líneas de ventas: payload.lines[]
app.post("/api/agent/sales_lines", requireAuth, async (req, res) => {
    const { source_db, extracted_at, lines } = req.body || {};
    if (!Array.isArray(lines)) return res.status(400).json({ error: "lines must be array" });

    const client = await pool.connect();
    try {
        await client.query("begin");

        const sql = `
      insert into rg7_hist.sales_lines
      (uniq_key,
       fuente, fecha_hora, tipo_documento, numero_documento,
       codigo_cliente, nombre_cliente, codigo_vendedor, vendedor, sucursal,
       codigo_producto, descripcion, barra_referencia, marca_producto, categoria_mapeada, categoria_tipo,
       tasa, precio_bs, precio_usd, cantidad, total_bs, total_usd, raw, extracted_at)
      values
      ($1,
       $2,$3,$4,$5,
       $6,$7,$8,$9,$10,
       $11,$12,$13,$14,$15,$16,
       $17,$18,$19,$20,$21,$22,$23,$24)
      on conflict (uniq_key) do nothing
      returning id
    `;

        let inserted = 0;
        for (const l of lines) {
            const fuente = (l.fuente || l.source || "UNKNOWN").toString().trim();
            const fecha_hora = (l.fecha_hora || l.fec_emis || null);
            const tipo_documento = (l.tipo_documento || "").toString().trim() || null;
            const numero_documento = (l.numero_documento || l.doc_num || "").toString().trim() || null;
            const sucursal = (l.sucursal || l.nombre_sucursal || "").toString().trim() || null;
            const codigo_producto = (l.codigo_producto || l.co_art || "").toString().trim() || null;

            const uniq_key = [
                fuente,
                sucursal || "",
                tipo_documento || "",
                numero_documento || "",
                codigo_producto || "",
                fecha_hora || ""
            ].join("|");

            const r = await client.query(sql, [
                uniq_key,

                fuente,
                fecha_hora,
                tipo_documento,
                numero_documento,

                (l.codigo_cliente || l.co_cli || null),
                (l.nombre_cliente || null),
                (l.codigo_vendedor || l.co_ven || null),
                (l.vendedor || l.nombre_vendedor || null),
                sucursal,

                codigo_producto,
                (l.descripcion || l.des_art || null),
                (l.barra_referencia || l.co_art || null),
                (l.marca_producto || l.categoria_mapeada || null),
                (l.categoria_mapeada || null),
                (l.categoria_tipo || null),

                (l.tasa ?? null),
                (l.precio_bs ?? l.prec_vta ?? null),
                (l.precio_usd ?? null),
                (l.cantidad ?? null),
                (l.total_bs ?? l.reng_neto ?? null),
                (l.total_usd ?? null),

                l, // raw
                extracted_at ? new Date(extracted_at) : new Date(),
            ]);

            if (r.rowCount === 1) inserted++;
        }


        await client.query("commit");
        res.json({ ok: true, inserted });
    } catch (e) {
        await client.query("rollback");
        res.status(500).json({ ok: false, error: String(e.message || e) });
    } finally {
        client.release();
    }
});

// Inserta líneas de compras: payload.lines[]
app.post("/api/agent/purchase_lines", requireAuth, async (req, res) => {
    const { extracted_at, lines } = req.body || {};
    if (!Array.isArray(lines)) return res.status(400).json({ error: "lines must be array" });

    const client = await pool.connect();
    try {
        await client.query("begin");

        const sql = `
      insert into rg7_hist.purchase_lines
      (fuente, fecha_hora, tipo_documento, numero_documento,
       codigo_sucursal, proveedor, codigo_producto, descripcion,
       cantidad, costo_bs, costo_usd, tasa_original, tasa_ref_dia, tasa_final, tasa_es_valida,
       raw, extracted_at)
      values
      ($1,$2,$3,$4,
       $5,$6,$7,$8,
       $9,$10,$11,$12,$13,$14,$15,
       $16,$17)
      returning id
    `;

        let inserted = 0;
        for (const l of lines) {
            await client.query(sql, [
                l.fuente || "UNKNOWN",
                l.fecha || l.fecha_hora || null,
                l.tipo_documento || null,
                l.numero_documento || null,

                l.codigo_sucursal || l.co_alma || null,
                l.proveedor || l.codprov || null,
                l.codigo_producto || null,
                l.descripcion || null,

                l.cantidad ?? null,
                l.costo_bs ?? null,
                l.costo_usd ?? null,
                l.tasa_original ?? null,
                l.tasa_ref_dia ?? null,
                l.tasa_final ?? null,
                l.tasa_es_valida ?? null,

                l,
                extracted_at ? new Date(extracted_at) : new Date(),
            ]);
            inserted++;
        }

        await client.query("commit");
        res.json({ ok: true, inserted });
    } catch (e) {
        await client.query("rollback");
        res.status(500).json({ ok: false, error: String(e.message || e) });
    } finally {
        client.release();
    }
});

app.listen(PORT, () => console.log("rg7-agent-api listening on", PORT));
