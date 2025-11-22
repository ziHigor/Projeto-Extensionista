require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// ** DEFINIÇÃO CORRETA DAS VARIÁVEIS CORS **
const allowedOrigins = ['https://inovacode.up.railway.app'];
const corsOptions = {
  origin: (origin, callback) => {
    // Permite o seu frontend e requisições sem 'origin' (ex: Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Se quiser bloquear origens não listadas, troque o next por: callback(new Error('Not allowed by CORS'));
      callback(null, true);
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Variável global para a pool de conexão
let pool = null;

// ** CONFIGURAÇÃO DE DB (MANTIDA FORA DO LISTEN PARA FÁCIL ACESSO) **
const connectionString = process.env.DATABASE_URL || null;
const dbConfig = connectionString ? {
  connectionString,
  ssl: {
    rejectUnauthorized: false // necessário no Railway para SSL
  }
} : null;

// === ROTAS DA API ===

// Health-check (útil para Railway / load balancers)
app.get("/health", (_req, res) => res.status(200).send("OK"));

app.get("/api", (_req, res) => {
  res.send("🚀 Novo servidor rodando!");
});

// Rota para leads
app.post("/api/leads", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });

  try {
    const { name, email, message } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Nome e email são obrigatórios" });
    }

    const q = "INSERT INTO leads (name, email, message) VALUES ($1,$2,$3) RETURNING id";
    const r = await pool.query(q, [name, email, message]);

    res.status(201).json({ id: r.rows[0].id });
  } catch (err) {
    console.error("Erro ao salvar lead:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Rota para salvar quiz
app.post("/api/quiz", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });

  try {
    const { user_email, score, total, answers } = req.body;
    if (typeof score !== "number" || typeof total !== "number") {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const q = `
      INSERT INTO quiz_attempts (user_email, score, total, answers, ip, user_agent)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, created_at
    `;
    const values = [
      user_email || null,
      score,
      total,
      answers ? JSON.stringify(answers) : null,
      req.ip,
      req.get("User-Agent") || null,
    ];

    const r = await pool.query(q, values);
    res.status(201).json({ id: r.rows[0].id, created_at: r.rows[0].created_at });
  } catch (err) {
    console.error("Erro ao salvar quiz:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Fallback final
app.use((_req, res) => {
  res.status(404).send("404: Endpoint da API não encontrado.");
});

// =======================================================
// ** INICIALIZAÇÃO E CONEXÃO DB AO INICIAR O SERVIDOR **
// =======================================================
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Conecta ao DB primeiro (se possível) para falhar rápido em caso de problema de credenciais
    if (dbConfig) {
      const dbPool = new Pool(dbConfig);
      await dbPool.query('SELECT 1');
      pool = dbPool;
      console.log("✅ CONEXÃO COM O BANCO DE DADOS BEM-SUCEDIDA!");
    } else {
      console.warn("⚠️ DATABASE_URL não definida. Rotas que usam DB irão retornar 503.");
    }
  } catch (err) {
    console.error("❌ ERRO CRÍTICO: FALHA AO CONECTAR AO DB!", err && err.message ? err.message : err);
    // Não encerra: deixamos o servidor subir para que logs/info fiquem acessíveis.
  }

  app.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log(`✅ Servidor Express rodando na porta ${PORT}`);
    console.log("-----------------------------------------");
  });
}

// Captura rejeições não tratadas para log
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

start();
