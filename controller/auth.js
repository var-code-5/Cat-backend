import pg from "pg";
import db from "../model/model.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

function generateAcessToken(id, empid) {
  const token = jwt.sign(
    { 'id': id, 'empid': empid },
    process.env.ACESS_TOKEN_SECRET,
    {
      expiresIn: "1h",
    }
  );
  return token;
}

function generateRefreshToken(id) {
  const refreshToken = jwt.sign(
    { 'id': id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "15d" }
  );
  return refreshToken;
}

var transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_ADDRESS,
    pass: process.env.MAIL_PASSWORD,
  },
});

async function verifyMail(email, token) {
  const link = "http://localhost:3000/auth/token/" + token;
  const info = await transporter.sendMail({
    from: '"AO3" <ao3gdsc@gmail.com>', // sender address
    to: email, // user email address
    subject: "Conform Your Mail Account", // Subject line
    html: `to activate your account please follow the ${link} on sucessful verification you will be redirected to the application</b>`, // html body
  });
}

export const post_register = (req, res) => {
  const password = req.body.password;
  const empId = req.body.empId;
  // Check if user exists
  db.connect();
  db.query("SELECT * FROM employee WHERE empid = $1", [empId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Server error");
      return;
    }
    else if (result.rowCount == 0) {
      res.status(409).send("Employee employee does not exist");
      return;
    }
    // if user dosen't exist
    else {
      const email = result.rows[0].email;
      db.query("SELECT * FROM login WHERE empid = $1",[empId],(err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send("Server error");
          return;
        }
        else if (result.rowCount > 0) {
          res.status(409).send("Employee already registered");
          return;
        }
        else{
          db.query(
            "INSERT INTO login (password,empid) VALUES($1,$2)",
            [password,empId],
            (err, result) => {
              if (err) {
                console.error(err);
                res.status(500).send("Server error");
                return;
              }
              res.send("Registration successful");
              // Node mailer will send mail to the user
              verifyMail(
                email,
                jwt.sign({ 'empid': empId }, process.env.ACESS_TOKEN_SECRET, {
                  expiresIn: "1h",
                })
              );
            }
          );
        } 
      });
    }
  });
};

// export const post_login = (req, res) => {
//   const empId = req.body.empId;
//   const password = req.body.password;
//   db.query("SELECT * FROM login WHERE empid = $1", [empId], (err, result) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send("Server error");
//       return;
//     }
//     if (result.rows.length === 0) {
//       res.status(401).send("User does not exist");
//       return;
//     }
//     const user = result.rows[0];
//     if (!bcrypt.compare(password, user.password)) {
//       res.status(401).send("Invalid credentials");
//       return;
//     }
//     if (result.rows[0].verified =='false') {
//       res.status(403).send("Please verify your mail address");
//       verifyMail(user.email,
//         jwt.sign({ "empid": empId }, process.env.ACESS_TOKEN_SECRET, {
//           expiresIn: "1h",
//         }));
//       return;
//     }
//     //auth sucess
//     const token = generateAcessToken(
//       result.rows[0].empid
//     );
//     const refreshToken = generateRefreshToken(
//       result.rows[0].id
//     );
//     res.cookie("refreshToken", refreshToken, { httpOnly: true });
//     res.cookie("token", token, { httpOnly: true });
//     res.status(200).send({"msg":"sucessful authentication"});
//   });
// };


export const post_login = async (req, res) => {
  const password = req.body.password;
  const empId = req.body.empId;
  
  try {
    await db.connect();
    const result = await db.query("SELECT * FROM login WHERE empid = $1", [empId]);

    if (result.rows.length === 0) {
      res.status(401).send("User does not exist");
      return;
    }

    const match = await bcrypt.compare(password, result.rows[0].password);
    if (!match) {
      res.status(401).send("Invalid credentials");
      return;
    }

    if (result.rows[0].verified == "false") {
      res.status(403).send("Please verify your mail address");
      verifyMail(
        empId,
        jwt.sign({ empId: empId }, process.env.ACESS_TOKEN_SECRET, {
          expiresIn: "1h",
        })
      );
      return;
    }

    //auth success
    const token = generateAcessToken(result.rows[0].empid);
    const refreshToken = generateRefreshToken(result.rows[0].id);

    res.cookie("refreshToken", refreshToken, { httpOnly: true });
    res.cookie("token", token, { httpOnly: true });
    res.status(200).send({ msg: "successful authentication" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};


export const get_token = (req, res) => {
  const token = req.params.token;
  jwt.verify(token, process.env.ACESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).send("Token is not valid");
      return;
    } else {
      db.connect();
      db.query("UPDATE login SET verified = true WHERE empid = $1;", [
        decoded.empid,
      ]);
      //sucessful verification of email
      db.query("SELECT * FROM login WHERE empId = $1", [decoded.empid], (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send("Server error");
          return;
        }
        const token = generateAcessToken(
          result.rows[0].empid
        );
        const refreshToken = generateRefreshToken(
          result.rows[0].id
        );
        res.cookie("refreshToken", refreshToken, { httpOnly: true });
        res.cookie("token", token, { httpOnly: true });
        res.setHeader('Content-type','text/html')
        res.status(200).send({ msg: "verified email you can visit the following link to <h1 href='https://google.com'>Click me</h1>" });
      })
    }
  });
};
