require("dotenv").config();
const express = require("express");
const cors = require("cors");
// Removendo a importação de Pool para simplificar, mas você pode deixar
// const { Pool } = require("pg"); 
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
let pool = null; // pool inicializado como null, desativando o DB por enquanto


// === ROTAS DA API === 

// ** ROTA DE HEALTH CHECK **: CRÍTICO PARA O RAILWAY
app.get("/health", (req, res) => {
    // A rota mais simples e garantida para retornar 200 (OK)
    return res.status(200).send("OK");
});


app.get("/api", (req, res) => {
  res.send("🚀 Novo servidor rodando!");
});

// Rotas de DB (agora retornarão 503, pois 'pool' é null)
app.post("/api/leads", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });
  
  // O código abaixo não será executado por enquanto, mas está correto
  // ...
});

app.post("/api/quiz", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Servidor indisponível: Conexão DB pendente" });

  // O código abaixo não será executado por enquanto, mas está correto
  // ...
});

// Fallback final
app.use((req, res) => {
  res.status(404).send("404: Endpoint da API não encontrado.");
});


// =======================================================
// ** INICIALIZAÇÃO SÍNCRONA **
// =======================================================
const PORT = process.env.PORT || 4000;

// O servidor Express inicia de forma síncrona
app.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log(`✅ Servidor rodando na porta ${PORT} (Conexão DB Desativada)`);
    console.log("-----------------------------------------");
});

// Importante: REMOVA a função initializeApp e o initializeApp().then() que você tinha anteriormente.