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
let pool = null; // pool inicializado como null

// =======================================================
// ** CORREÇÃO DE DB **: Configuração da Conexão e SSL
// =======================================================
const connectionString = process.env.DATABASE_URL;

// Configuração para o Pool, usando a connectionString e habilitando o SSL
// MANTEMOS A CONFIGURAÇÃO CASO QUEIRA ATIVAR DE NOVO
const dbConfig = {
    connectionString: connectionString, 
    ssl: {
        rejectUnauthorized: false
    }
};

// =======================================================
// FLUXO PRINCIPAL: Tenta conectar ao DB e Inicia o Servidor
// =======================================================
const initializeApp = async () => {
    
    // 1. TENTA CONEXÃO E CRIA O POOL
    
    try {
        
        // *************************************************************
        // ** DEBBUG TEMPORÁRIO: CONEXÃO COM DB FOI REMOVIDA DAQUI **
        // *************************************************************
        
        console.log("-----------------------------------------");
        console.log("✅ CONEXÃO COM O BANCO DE DADOS TEMPORARIAMENTE IGNORADA!");
        console.log("-----------------------------------------");
        
        // 2. INICIA O SERVIDOR APÓS O SUCESSO DA CONEXÃO
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

        return null; // Retorna null, pois não criamos a Pool
        
    } catch (err) {
        // Se a inicialização do app falhar por outro motivo
        console.error("=========================================");
        console.error("❌ ERRO CRÍTICO: FALHA AO INICIALIZAR O APP!");
        console.error("ERRO COMPLETO:", err.message); 
        console.error("=========================================");
        return null; 
    }
};

// =======================================================
// EXECUÇÃO DO FLUXO
// =======================================================
initializeApp().then(dbPool => {
    // pool permanece null aqui, pois initializeApp retorna null
}).catch(e => {
    console.error("Falha ao inicializar o aplicativo.");
});


// === ROTAS DA API === 

// ** ROTA DE HEALTH CHECK **: CRÍTICO PARA O RAILWAY
app.get("/health", (req, res) => {
    // Apenas retorna OK para o Health Check
    return res.status(200).send("OK");
});


app.get("/api", (req, res) => {
  res.send("🚀 Novo servidor rodando!");
});

// Rotas de DB (agora retornarão 503, pois 'pool' é null)
app.post("/api/leads", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });
  // ... (restante da rota, nunca será executada)
});

app.post("/api/quiz", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });
  // ... (restante da rota, nunca será executada)
});

// Fallback final
app.use((req, res) => {
  res.status(404).send("404: Endpoint da API não encontrado.");
});