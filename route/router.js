import express from "express";
import * as auth from "../controller/auth.js"
import hashpass from "../middleware/hashpass.js";
import bodyParser from "body-parser";

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));

router.post("/login", auth.post_login);
router.post("/register", hashpass ,auth.post_register);
router.get("/token/:token", auth.get_token);
router.get("/",(req,res)=>{
    res.send("Auth routes are active");
})

export default router;