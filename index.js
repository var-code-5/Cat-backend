import Express from "express";
import env from "dotenv";
import router from "./route/router.js";
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

env.config();

const app = Express();
const port = 3000||process.env.PORT;

app.use("/auth",router);
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.get("/", (req, res) =>{
    res.send("You are in CAT Hackathon");
});

app.listen(port,(req,res)=>{
    console.log(`Server is running on port ${port}`);
});