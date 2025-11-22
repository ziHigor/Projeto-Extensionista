require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();

// Configuração do CORS
const allowedOrigins = ['https://inovacode.up.railway.app'];
const corsOptions = {
    origin: (origin, callback) => {
        // Permite o seu frontend e requisições sem 'origin'
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

// =======================================================
// ** CORREÇÃO DE DB **: Configuração da Conexão e SSL
// =======================================================
const connectionString = process.env.DATABASE_URL;

// Configuração para o Pool, usando a connectionString e habilitando o SSL
const dbConfig = {
    connectionString: connectionString, // Usa a URL completa do Railway
    ssl: {
        rejectUnauthorized: false // CRÍTICO para Railway: Permite a conexão SSL
    }
};

// =======================================================
// FLUXO PRINCIPAL: Tenta conectar ao DB e Inicia o Servidor
// =======================================================
const initializeApp = async () => {
    
    // 1. TENTA CONEXÃO E CRIA O POOL
    const dbPool = new Pool(dbConfig); 
    
    try {
        await dbPool.query('SELECT 1'); // Teste simples para verificar a conexão
        
        // Se o teste for bem-sucedido:
        console.log("-----------------------------------------");
        console.log("✅ CONEXÃO COM O BANCO DE DADOS BEM-SUCEDIDA!");
        console.log("-----------------------------------------");
        
        // 2. INICIA O SERVIDOR APÓS O SUCESSO DA CONEXÃO
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

        return dbPool; // Retorna a pool de conexão
        
    } catch (err) {
        // 3. SE A CONEXÃO FALHAR, LOGA O ERRO COMPLETO 
        console.error("=========================================");
        console.error("❌ ERRO CRÍTICO: FALHA AO CONECTAR AO DB!");
        console.error("VERIFIQUE O STATUS DO POSTGRES E AS VARIÁVEIS DE AMBIENTE!");
        console.error("ERRO COMPLETO:", err.message); // A MENSAGEM REAL VAI APARECER AQUI
        console.error("=========================================");
        
        // Removido process.exit(1) para permitir que o Railway tente se recuperar/reiniciar
        // Se a conexão falhar, o pool permanecerá null, e as rotas responderão 503.
        return null; 
    }
};

// =======================================================
// EXECUÇÃO DO FLUXO
// =======================================================
initializeApp().then(dbPool => {
    pool = dbPool; // Atribui a pool globalmente APÓS a conexão (ou null se falhou)
}).catch(e => {
    console.error("Falha ao inicializar o aplicativo.");
});


// === ROTAS DA API === 

// ** ROTA DE HEALTH CHECK **: CRÍTICO PARA O RAILWAY
app.get("/health", (req, res) => {
    // Verifica se a pool está ativa (opcional, mas bom)
    if (pool) {
        return res.status(200).send("OK - DB Conectado");
    }
    // Se o pool falhou na inicialização, retorna um status de erro
    return res.status(503).send("ERRO - DB Pendente");
});


app.get("/api", (req, res) => {
  res.send("🚀 Novo servidor rodando!");
});

// Rota para leads
app.post("/api/leads", async (req, res) => {
  // Use a pool global
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
  // Use a pool global
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
app.use((req, res) => {
  res.status(404).send("404: Endpoint da API não encontrado.");
});