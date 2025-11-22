require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg"); // Importação do Pool
const path = require("path");

const app = express();

// ... (Seu CORS e Middlewares) ...
const allowedOrigins = ['https://inovacode.up.railway.app'];
// ... (Seu CORS e Middlewares) ...

app.use(cors(corsOptions));
app.use(express.json());

// Variável global para a pool de conexão
let pool = null; 

// ** CONFIGURAÇÃO DE DB **
const connectionString = process.env.DATABASE_URL;
const dbConfig = {
    connectionString: connectionString, 
    ssl: {
        rejectUnauthorized: false // CRÍTICO para SSL
    }
};


// === ROTAS DA API === 

// ** ROTA DE HEALTH CHECK **
app.get("/health", (req, res) => {
    // Retorna 200 (OK) sempre que o servidor estiver rodando
    return res.status(200).send("OK");
});


app.get("/api", (req, res) => {
  res.send("🚀 Novo servidor rodando!");
});

// Rota para leads
app.post("/api/leads", async (req, res) => {
  // Use a pool global
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });
  
  // ... (Sua lógica de DB original) ...
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
  // Use a pool global
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });

  // ... (Sua lógica de DB original) ...
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
app.use((req, res) => {
  res.status(404).send("404: Endpoint da API não encontrado.");
});


// =======================================================
// ** INICIALIZAÇÃO SÍNCRONA E CONEXÃO DB EM BACKGROUND **
// =======================================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
    console.log("-----------------------------------------");
    console.log(`✅ Servidor Express rodando na porta ${PORT}`);
    
    // Tenta conectar ao DB em background APÓS o servidor iniciar
    try {
        const dbPool = new Pool(dbConfig);
        await dbPool.query('SELECT 1');
        
        pool = dbPool; // Atribui a pool global SÓ APÓS o sucesso
        console.log("✅ CONEXÃO COM O BANCO DE DADOS BEM-SUCEDIDA!");
        
    } catch (err) {
        console.error("❌ ERRO CRÍTICO: FALHA AO CONECTAR AO DB!");
        console.error("ERRO COMPLETO:", err.message);
    }
    console.log("-----------------------------------------");
});