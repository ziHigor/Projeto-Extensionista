require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

const allowedOrigins = ['https://inovacode.up.railway.app'];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); 
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

let pool;

// AJUSTE 1: Rota raiz para Health Check do Railway
app.get("/", (req, res) => {
  res.status(200).send("Backend is running and healthy!");
});

let connectionString = process.env.DATABASE_URL;
if (connectionString && !connectionString.includes('sslmode')) {
    // Força SSL se não tiver, mas usa 'require' que é mais padrão para urls externos se 'disable' falhar
    // Se 'disable' funcionou antes, mantenha. Se não, tente 'require' ou 'no-verify'
    connectionString += '?sslmode=require'; 
}

const initializeApp = async () => {
    if (!connectionString) {
        console.error("ERRO CRÍTICO: DATABASE_URL faltando!");
        process.exit(1);
    }

    const dbPool = new Pool({ 
        connectionString,
        ssl: { rejectUnauthorized: false } // Isso geralmente cobre o 'self-signed'
    }); 
    
    try {
        await dbPool.query('SELECT 1');
        console.log("✅ DB CONECTADO!");
        
        const PORT = process.env.PORT || 4000;
        // AJUSTE 2: Forçar escuta no 0.0.0.0
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ SERVIDOR ONLINE na porta ${PORT}`);
        });

        return dbPool;
    } catch (err) {
        console.error("❌ FALHA DB:", err.message);
        process.exit(1);
    }
};

initializeApp().then(dbPool => {
    pool = dbPool;
}).catch(e => {
    console.error("Falha fatal na inicialização.");
    process.exit(1);
});

app.get("/api", (req, res) => res.send("🚀 API Online!"));

app.post("/api/leads", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "DB não pronto" });
  try {
    const { name, email, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Faltando dados" });
    const r = await pool.query("INSERT INTO leads (name, email, message) VALUES ($1,$2,$3) RETURNING id", [name, email, message]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (err) {
    console.error("Erro lead:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/quiz", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "DB não pronto" });
  try {
    const { user_email, score, total, answers } = req.body;
    const r = await pool.query(`INSERT INTO quiz_attempts (user_email, score, total, answers, ip, user_agent) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [user_email, score, total, JSON.stringify(answers), req.ip, req.get("User-Agent")]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (err) {
    console.error("Erro quiz:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Fallback (deixe por último)
app.use((req, res) => res.status(404).send("Rota não encontrada"));