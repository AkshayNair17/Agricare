require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  try {
    const models = await groq.models.list();

    console.log("\n===== AVAILABLE MODELS =====\n");

    models.data.forEach((model) => {
      console.log(model.id);
    });

    console.log("\n============================");
  } catch (err) {
    console.error(err);
  }
}

main();