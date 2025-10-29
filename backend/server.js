require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// Configuração do CORS (para permitir o frontend)
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

// Variável global para a pool de conexão
let pool;

// === FUNÇÃO DE CONEXÃO E INICIALIZAÇÃO (Mais Robusta) ===
const initializeApp = async () => {
    
    // Prioriza o URL que vamos configurar manualmente no Railway
    let connectionString = process.env.DATABASE_URL;

    // ESSENCIAL: Adiciona a flag SSL para o Railway
    if (connectionString && !connectionString.includes('sslmode')) {
        connectionString += '?sslmode=require';
    }

    // Verifica se a string de conexão foi resolvida
    if (!connectionString) {
        console.error("ERRO CRÍTICO: Variável DATABASE_URL não foi encontrada. O app não pode iniciar.");
        process.exit(1);
    }
    
    // 1. TENTA CONEXÃO E CRIA O POOL
    const dbPool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } }); 
    
    try {
        await dbPool.query('SELECT 1'); // Teste simples de conexão
        
        // Se o teste for bem-sucedido:
        console.log("-----------------------------------------");
        console.log("✅ CONEXÃO COM O BANCO DE DADOS BEM-SUCEDIDA!");
        console.log("-----------------------------------------");
        
        // 2. INICIA O SERVIDOR APÓS O SUCESSO DA CONEXÃO
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

        return dbPool;
        
    } catch (err) {
        // 3. SE A CONEXÃO FALHAR, LOGA O ERRO COMPLETO E ENCERRA
        console.error("=========================================");
        console.error("❌ ERRO CRÍTICO: FALHA AO CONECTAR AO DB!");
        console.error("ERRO COMPLETO:", err.message); // A MENSAGEM REAL VAI APARECER AQUI
        console.error("=========================================");
        process.exit(1);
    }
};

// === EXECUÇÃO DO FLUXO ===
initializeApp().then(dbPool => {
    pool = dbPool;
}).catch(e => {
    // Isso deve ser coberto pelo try/catch acima, mas é um log de segurança
    console.error("Falha ao inicializar o aplicativo.");
    process.exit(1);
});


// === ROTAS DA API === 
app.get("/api", (req, res) => {
  res.send("🚀 Novo servidor rodando!");
});

// Rota para leads
app.post("/api/leads", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });
  try {
    const { name, email, message } = req.body;
    if (!name || !email) { return res.status(400).json({ error: "Nome e email são obrigatórios" }); }
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
    if (typeof score !== "number" || typeof total !== "number") { return res.status(400).json({ error: "Payload inválido" }); }
    const q = `INSERT INTO quiz_attempts (user_email, score, total, answers, ip, user_agent) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`;
    const values = [ user_email || null, score, total, answers ? JSON.stringify(answers) : null, req.ip, req.get("User-Agent") || null, ];
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