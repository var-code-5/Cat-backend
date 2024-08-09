import Express from "express";
import env from "dotenv";

env.config();

const app = Express();
const port = 3000||process.env.PORT;

app.get("/", (req, res) =>{
    res.send("You are in CAT Hackathon");
});

app.listen(port,(req,res)=>{
    console.log(`Server is running on port ${port}`);
});