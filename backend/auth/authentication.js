const db = require('../db');
const bcrypt = require('bcrypt');
const jwtUtils = require('../token/jwtUtils');
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');



function registerUser(req, res) {
  const {
    fullName,
    personalEmail,
    password
  } = req.body;

  const userId = generateUserID();
  const fetchUserName = `SELECT * FROM hr.users WHERE personalemail = $1`;
  const insertUserQuery = `INSERT INTO hr.users(userid, fullname, usertype, personalemail, password, verificationtoken, verified) VALUES($1, $2, $3, $4, $5, $6, $7)`;

  db.query(fetchUserName, [personalEmail], (fetchUsernameError, fetchUsernameResult) => {
    if (fetchUsernameError) {
      return res.status(401).json({ 
        status: 401,
        message: 'Error Checking User Email',
        data: {}
      });
    }
    if (fetchUsernameResult.rows.length > 0) {
      return res.status(401).json({ 
        status: 401,
        message: 'User Already Exists',
        data: {}
         });
    }
    bcrypt.hash(password, 10, (error, hashedPassword) => {
      if (error) {
        return res.status(401).json({ 
          status: 401,
          message: 'Error During Hashing Password',
          data: {}
           });
      }
      const verificationToken = jwtUtils.generateToken({ personalEmail: personalEmail });
      db.query(insertUserQuery, [userId, fullName, 'hr', personalEmail, hashedPassword, verificationToken, '0'], (insertUserError, insertUserResult) => {
        if (insertUserError) {
          console.error('Error during user insertion:', insertUserError);
          return res.status(500).json({ 
            status: 500,
            message: 'Internal server error',
            data: {}
             });
        }
        try {
          sendTokenEmail(personalEmail, verificationToken);
          console.log('User registered successfully');
          return res.status(200).json({ 
            status: 200,
            message: 'Registration successful. Check your email for the verification token.',
            data: {}
          });
          } catch (sendTokenError) {
          console.error('Error sending verification token:', sendTokenError);
          return res.status(500).json({ 
            status: 200,
            message: 'Internal server error',
            data: {}
           });
        }
      });
    });
  });
}

  
function sendTokenEmail(email, token, fullName) {


  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: "kpohekar19@gmail.com",
      pass: "woptjevenzhqmrpp"
    },
  });

  // Read the email template file
  const templatePath = path.join(__dirname, '../mail-body/email-template.ejs');
  fs.readFile(templatePath, 'utf8', (err, templateData) => {
    if (err) {
      console.error('Error reading email template:', err);
      return;
    }

    // Compile the email template with EJS
    const compiledTemplate = ejs.compile(templateData);

    // Render the template with the token
    const html = compiledTemplate({ token, fullName});

    const mailOptions = {
      from: 'kpohekar19@gmail.com',
      to: email,
      subject: 'Registration Token',
      html: html,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }

    });
  });
} 


function getUserById(req, res) {
    const userId = req.params.userId;
    const getUserByUserIdQuery = `SELECT * FROM hr.users WHERE userid = $1`;
  
    db.query(getUserByUserIdQuery, [userId], (fetchUserIdError, fetchUserIdResult) => {
      if (fetchUserIdError) {
        return res.status(401).json({ message: 'Error while fetching user' });
      }
      res.json({ getUserById: fetchUserIdResult.rows });
    });
  }
  
function getUsers(req, res) {
    const getUserByUserQuery = `SELECT * FROM hr.users`;
  
    db.query(getUserByUserQuery, (fetchUsersError, fetchUsersResult) => {
      if (fetchUsersError) {
        return res.status(401).json({ message: 'Error while fetching users' });
      }
      res.json(fetchUsersResult.rows);
    });
  }

  function getdevs(req, res) {
    const getUserByUserQuery = `SELECT * FROM hr.devlopers`;
  
    db.query(getUserByUserQuery, (fetchUsersError, fetchUsersResult) => {
      if (fetchUsersError) {
        return res.status(401).json({ message: 'Error while fetching users' });
      }
      res.json(fetchUsersResult.rows);
    });
  }
  function login(req, res) {
    const { Username, Password } = req.body;
  
    // Check if the user exists in the database
    const query = 'SELECT * FROM hr.users WHERE personalemail = $1';
    db.query(query, [Username], (error, result) => {
      try {
        if (error) {
          throw new Error('Error during login');
        }
        const user = result.rows[0];
        if (!user) {
          console.error('User does not exist!');
          return res.status(401).json({
            status: 401,
            message: 'User does not exist!',
            data: {}
          });
        }
  
        if (user.verified === 0) {
          console.error('User is not verified. Please verify your account.');
          return res.status(401).json({
            status: 401,
            message: 'User is not verified. Please verify your account.',
            data: {}
          });
        }
  
        // Compare the provided password with the hashed password in the database
        bcrypt.compare(Password, user.password, (error, isPasswordValid) => {
          try {
            if (error) {
              throw new Error('Error during password comparison');
            }
  
            if (!isPasswordValid) {
              console.error('Invalid credentials');
              return res.status(401).json({
                status: 401,
                message: 'Invalid credentials',
                data: {}
              });
            }
  
            // Generate a JWT token with personalemail included
            const tokenPayload = {
              personalemail: user.personalemail // Add personalemail to the token payload
            };
            const token = jwtUtils.generateToken(tokenPayload);
  
            // Log the success if no error occurred
            res.json({
              token: token,
              userid: user.userid,
              fullname: user.fullname,
              contactno: user.contactno,
              usertype: user.usertype,
              personalemail: user.personalemail
  
            });
          } catch (error) {
            console.error(error);
            res.status(500).json({
              status: 500,
              message: 'Internal server error',
              data: {}
            });
          }
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          status: 500,
          message: 'Internal server error',
          data: {}
        });
      }
    });
  }
  

  function user(req, res) {
    // Check if Authorization header exists
    if (!req.headers.authorization) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = req.headers.authorization.split(' ')[1];
    console.log("Received token:", token);

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY); // Using process.env.JWT_SECRET_KEY
        console.log("Decoded token:", decodedToken);

        if (!decodedToken) {
            console.log("Token verification failed or invalid token.");
            return res.status(401).json({ message: 'Invalid token' });
        }

        const getUserDetailsQuery = `SELECT * FROM hr.users WHERE personalemail = $1`;
        console.log("Executing query:", getUserDetailsQuery);
        db.query(getUserDetailsQuery, [decodedToken.personalemail], (fetchUserError, fetchUsernameResult) => {
            if (fetchUserError) {
                console.error("Error fetching user details:", fetchUserError);
                return res.status(401).json({ message: 'Error while fetching user details' });
            }
            if (fetchUsernameResult.rows.length === 0) {
                console.log("User not found.");
                return res.status(404).json({ message: 'No user Found' });
            }
            console.log("User details found:", fetchUsernameResult.rows[0]);
            res.json(fetchUsernameResult.rows[0]);
        });
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({ message: 'Invalid token' });
    }
}



  function editUser(req, res) {
    const userId = req.params.userId;
    const {
      fullName,
      personalEmail,
    } = req.body;
  
    const editUserQuery = `UPDATE hr.users SET fullName = $1, personalemail = $2 WHERE userid = $3`;
    
    db.query(editUserQuery, [
      fullName,
      personalEmail,
      userId
    ], (updateError, updateResult) => {
      if (updateError) {
        return res.status(401).json({ message: 'Error While Updating User' });
      }
      return res.status(200).json({ message: 'User Updated Successfully' });
    });
  }
  

  function deleteUser(req, res) {
    const userId = req.params.userId;
    const deleteUserQuery = `DELETE FROM app.users WHERE userid = $1`;
  
    db.query(deleteUserQuery, [userId], (deleteError, deleteResult) => {
      if (deleteError) {
        return res.status(401).json({ message: 'Error While Deleting User' });
      }
      if (deleteResult.rowCount === 0) {
        return res.status(404).json({ message: 'User Not Found' });
      }
      return res.status(200).json({ message: 'User Deleted Successfully' });
    });
  }
  

function generateUserID() {
  const userIdLength = 10;
  let userId = '';

  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  for (let i = 0; i < userIdLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    userId += characters.charAt(randomIndex);
  }

  return userId;
}

function resetPassword(req, res) {
  const { token, password } = req.body;

  // Check if the email and reset token match in the database
  const query = 'SELECT * FROM app.reset_tokens WHERE token = $1';
  db.query(query, [token], (error, result) => {
    if (error) {
      console.error('Error during reset password query:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const tokenData = result.rows[0];
    const userId = tokenData.userid;

    // Hash the new password
    bcrypt.hash(password, 10, (error, hashedPassword) => {
      if (error) {
        console.error('Error during password hashing:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Update the password in the database
      const updateQuery = 'UPDATE app.users SET password = $1 WHERE userid = $2';
      db.query(updateQuery, [hashedPassword, userId], (error, updateResult) => {
        if (error) {
          console.error('Error updating password:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // Delete the reset token from the reset_tokens table
        const deleteQuery = 'DELETE FROM app.reset_tokens WHERE token = $1';
        db.query(deleteQuery, [token], (error, deleteResult) => {
          if (error) {
            console.error('Error deleting reset token:', error);
          }

          res.json({ message: 'Password reset successful' });
        });
      });
    });
  });
}


function updatePassword(req, res) {
  const UserId = req.params.UserId;
  const { Password } = req.body;

  // Check if the user exists in the database
  const userCheckQuery = 'SELECT * FROM hr.users WHERE userid = $1';
  db.query(userCheckQuery, [UserId], (error, useridCheckResult) => {
    try {
      if (error) {
        console.error('Error during UserId check:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (useridCheckResult.length === 0) {
        console.log('User not found!');
        return res.status(400).json({ message: 'User not found!' });
      }

      // Hash the new password
      const hashedPassword = bcrypt.hashSync(Password, 10);

      // Update the user's password in the database
      const updatePasswordQuery = 'UPDATE hr.users SET password = $1 WHERE userid = $2';
      db.query(updatePasswordQuery, [hashedPassword, UserId], (error, result) => {
        if (error) {
          console.error('Error updating password:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        res.json({ message: 'Password updated successfully' });
        console.log(result);
      });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

function forgotPassword(req, res) {
  const { personalEmail } = req.body;

  const query = 'SELECT * FROM app.users WHERE personalemail = $1';
  db.query(query, [personalEmail], (error, result) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ 
        status: 500,
        message: 'Internal server error',
        data: {}
     });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ 
      message: 'User not found',
      status: 404,
      data: {} 
    });
    }

    const resetToken = jwtUtils.generateToken({ personalEmail });

    const userId = result.rows[0].userid; 
    const insertQuery = 'INSERT INTO app.reset_tokens (userid, token) VALUES ($1, $2)';
    db.query(insertQuery, [userId, resetToken], (insertError) => {
      if (insertError) {
        console.error(insertError);
        return res.status(500).json({ 
          message: 'Error saving reset token',
          status: 500,
          data: {} 
       });
      }
      sendResetTokenEmail(personalEmail, resetToken);

      res.json({ 
        message: 'Reset token sent to your email',
        status: 200,
        data: {} 
       });
    });
  });
}



function sendResetTokenEmail(personalEmail, resetToken) {

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'kpohekar19@gmail.com',
      pass: 'woptjevenzhqmrpp',
    },
  });

  // Read the email template file
  const templatePath = path.join(__dirname, '../mail-body/email-template-forgot-password.ejs');
  fs.readFile(templatePath, 'utf8', (err, templateData) => {
    if (err) {
      console.error('Error reading email template:', err);
      return;
    }

    // Compile the email template with EJS
    const compiledTemplate = ejs.compile(templateData);

    // Render the template with the reset token
    const html = compiledTemplate({ resetToken });

    const mailOptions = {
      from: 'kpohekar19@gmail.com',
      to: personalEmail,
      subject: 'Reset Password Link',
      html: html,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  });
}
module.exports = { 
  registerUser,
  getUserById,
  getUsers,
  login,
  user,
  editUser,
  deleteUser,
  resetPassword,
  updatePassword,
  forgotPassword,
  sendResetTokenEmail,
  getdevs
  
}