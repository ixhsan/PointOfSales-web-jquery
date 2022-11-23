var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const helpers = require("../helpers/util");

module.exports = function (db) {
  let runNum = 1;
  let sql = ``;

  /* USERS */
  router
    .route("/users")
    // 1. GET METHOD - Read Users data
    .get(helpers.isLoggedIn, async function (req, res) {
      try {
        let params = [];

        if (req.query.search.value) {
          params.push(`name like '%${req.query.search.value}%'`);
          params.push(`email like '%${req.query.search.value}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        console.log({ queryUsers: req.query });

        let queryTotal = `select count(*) as total from users${
          params.length > 0 ? ` where ${params.join(" or ")}` : ""
        }`;
        let queryData = `select * from users${
          params.length > 0 ? ` where ${params.join(" or ")}` : ""
        } order by ${sortBy} ${sortMode} limit ${limit} offset ${offset}`;

        console.log({
          sqlQuery: {
            queryTotal,
            queryData
          }
        });

        const total = await db.query(queryTotal);
        const data = await db.query(queryData);

        console.log({
          "Percobaan ke": runNum,
          limit,
          offset,
          sortBy,
          sortMode,
          hasil: total.rows,
          data: data.rows,
        });

        const response = {
          draw: Number(req.query.draw),
          recordsTotal: total.rows[0].total,
          recordsFiltered: total.rows[0].total,
          data: data.rows,
          info: req.flash(`info`),
        };

        runNum++;
        res.json(response);
      } catch (error) {
        res.json(error);
      }
    })
    // 2. POST METHOD - ADD new users data
    .post(helpers.isLoggedIn, async function (req, res) {
      try {
        sql = `SELECT * FROM users where email = $1`;
        const { name, email, password, role } = req.body;

        // Check if email already exist
        const emailCheck = await db.query(sql, [email]);

        if (emailCheck.rowCount) {
          return res.json({
            data: null,
          });
        }

        if (!emailCheck.rowCount && !name && !password && !role) {
          `    `;
          return res.json({
            data: emailCheck.rows,
          });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        sql = `INSERT INTO users("email", "name", "password", "role") VALUES ($1, $2, $3, $4)`;

        const insertData = await db.query(sql, [
          email,
          name,
          hashedPassword,
          role,
        ]);

        res.json(insertData);
      } catch (error) {
        res.json(error);
      }
    });

  // 3. DELETE METHOD - Delete users data
  router
    .route("/users/:userid")
    .get(helpers.isLoggedIn, async function (req, res) {
      try {
        sql = 'SELECT * FROM users WHERE "userid" = $1';
        const userid = parseInt(req.params.userid);
        const getData = await db.query(sql, [userid]);
        console.log(getData);
        res.json(getData);
      } catch (error) {
        res.json(error);
      }
    })
    .put(helpers.isLoggedIn, async function (req, res) {
      try {
        const response = [
          req.body.email,
          req.body.name,
          req.body.role,
          parseInt(req.params.userid),
        ];

        sql =
          'UPDATE users SET "email" = $1, "name" = $2, "role" = $3 WHERE "userid" = $4';
        const getData = await db.query(sql, response);

        console.log(getData);
        res.json(getData);
      } catch (error) {
        res.json(error);
      }
    })
    .delete(helpers.isLoggedIn, async function (req, res) {
      try {
        sql = 'DELETE FROM users WHERE "userid" = $1';
        const userid = parseInt(req.params.userid);
        const deleteData = await db.query(sql, [userid]);
        res.json(deleteData);
      } catch (error) {
        res.json(error);
      }
    });

  runNum++;

  return router;
};