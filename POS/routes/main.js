var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { isLoggedIn } = require("../public/javascripts/util");

module.exports = function (db) {
  /* HOMEPAGE - DASHBOARD */
  router.route("/").get(isLoggedIn, async function (req, res) {
    let sql;
    try {
      sql = `SELECT COUNT(*) AS timessales, SUM(totalsum) AS totalsales, (SELECT SUM(totalsum) FROM purchases) AS totalpurchases, SUM(totalsum) - (SELECT SUM(totalsum) FROM purchases) AS earnings FROM sales`;
      const { rows: getStats } = await db.query(sql);
      res.json({
        user: req.session.user,
        stats: getStats[0],
      });
    } catch (error) {
      res.send("error");
    }
  });

  router.route("/chart").get(isLoggedIn, async function (req, res) {
    try {
      let params = [];
      const {startDate, endDate} = req.query

      console.log({
        startDate,
        endDate
      });
      
      if (startDate && endDate) {
        params.push(`coalesce(to_char(purchases.time, 'YYYY-MM-DD'), to_char(sales.time, 'YYYY-MM-DD')) BETWEEN '${startDate}' AND '${endDate}'`);
      } else if (startDate && !endDate) {
        params.push(`coalesce(to_char(purchases.time, 'YYYY-MM-DD'), to_char(sales.time, 'YYYY-MM-DD')) = '${startDate}'`);
      } else if (!startDate && endDate) {
        params.push(`coalesce(to_char(purchases.time, 'YYYY-MM-DD'), to_char(sales.time, 'YYYY-MM-DD')) = '${endDate}'`);
      }

      sql = `SELECT coalesce(sum(sales.totalsum), 0) - coalesce(sum(purchases.totalsum), 0) AS earnings, coalesce(to_char(sales.time, 'Mon YY'), to_char(purchases.time, 'Mon YY')) AS date FROM sales FULL OUTER JOIN purchases ON sales.time = purchases.time${params.length > 0 ? ` WHERE ${params.join(" OR ")}` : "" } GROUP BY date ORDER BY date DESC`;

      let sql2 = `select sum(case when sales.customer = 1 then 1 else 0 end) as direct, sum(case when sales.customer = 2 then 1 else 0 end) as customer from sales left join customers on customers.customerid = sales.customer left join purchases on purchases.time = sales.time${params.length > 0 ? ` WHERE ${params.join(" OR ")}` : "" }`;

      const { rows: chart } = await db.query(sql);
      const { rows: customer } = await db.query(sql2);

      res.json({
        line: chart,
        doughnut: customer,
      });
    } catch (error) {
      res.json(error);
    }
  });

  router.route("/table").get(isLoggedIn, async function (req, res) {
    try {
      let params = [];

      if (req.query.search.value) {
        params.push(`monthly ILIKE '%${req.query.search.value}%'`);
        params.push(`expense::VARCHAR ILIKE '%${req.query.search.value}%'`);
        params.push(`revenue::VARCHAR ILIKE '%${req.query.search.value}%'`);
        params.push(`earnings::VARCHAR ILIKE '%${req.query.search.value}%'`);
      }

      const limit = req.query.length;
      const offset = req.query.start;
      const sortBy = req.query.columns[req.query.order[0].column].data;
      const sortMode = req.query.order[0].dir;

      let queryTotal = `SELECT count(*) as TOTAL FROM pos_monthly_report${
        params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
      }`;
      let queryData = `SELECT * FROM pos_monthly_report${
        params.length > 0 ? ` WHERE ${params.join(" OR ")}` : ""
      } ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`;

      const total = await db.query(queryTotal);
      const data = await db.query(queryData);
      
      const response = {
        draw: Number(req.query.draw),
        recordsTotal: total.rows[0].total,
        recordsFiltered: total.rows[0].total,
        data: data.rows,
      };

      res.json(response);
    } catch (error) {
      res.json(error);
    }
  });

  return router;
};