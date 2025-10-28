require("dotenv").config();
const express = require("express");
const cors = require("cors"); 
const { Pool } = require("pg");
const path = require("path"); 

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

const { Client } = require("pg");

// Use o DATABASE_URL para a conexão
const connectionString = process.env.DATABASE_URL;

// Tenta conectar e sair do processo se falhar.
const testConnection = async () => {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("-----------------------------------------");
    console.log("✅ CONEXÃO COM O BANCO DE DADOS BEM-SUCEDIDA!");
    console.log("-----------------------------------------");
    await client.end(); // Fecha o cliente de teste
  } catch (err) {
    console.error("=========================================");
    console.error("❌ ERRO CRÍTICO: FALHA AO CONECTAR AO DB!");
    console.error("ERRO COMPLETO:", err.message);
    console.error("VERIFIQUE AS CREDENCIAIS E O STATUS DO POSTGRES!");
    console.error("=========================================");
    process.exit(1); // Encerra o processo para mostrar o erro no log
  }
};
// =======================================================
// Execute o teste de conexão.
// O servidor só vai iniciar se este teste for bem-sucedido.
testConnection();

// O pool de conexão real para o servidor deve ser recriado aqui, APÓS o teste.
const pool = new Pool({ connectionString });
// Fim do bloco de conexão.


// === ROTAS DA API === (sem alteração)
app.get("/api", (req, res) => {
  res.send("🚀 Novo servidor rodando!");
});

// Rota para leads (sem alteração)
app.post("/api/leads", async (req, res) => {
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

app.post("/api/quiz", async (req, res) => {
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

app.use((req, res) => {
  res.status(404).send("404: Endpoint da API não encontrado.");
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));