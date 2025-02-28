const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const pool = require('../config/database');
// Get all inventory items
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM inventory ORDER BY id ASC");
        res.render("inventory", { inventory: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).send("Database error");
    }
});

// Add a new product
router.post("/add", async (req, res) => {
    const { product_name, quantity, price, GST, unit } = req.body;
    try {
        await pool.query(
            "INSERT INTO inventory (product_name, quantity, price, GST, unit) VALUES ($1, $2, $3, $4, $5)",
            [product_name, quantity, price, GST, unit]
        );
        res.redirect("/api/inventory");
    } catch (error) {
        console.error(error);
        res.status(500).send("Database error");
    }
});

// Delete a product
router.post("/delete/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM inventory WHERE id = $1", [req.params.id]);
        res.redirect("/inventory");
    } catch (error) {
        console.error(error);
        res.status(500).send("Database error");
    }
});


router.get("/All_Data",verifyToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM inventory ORDER BY id ASC");
        res.json(result.rows); // Send all inventory items as JSON response
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
});



// POST API - Fetch screens based on assign_city
router.post("/getScreens",verifyToken, async (req, res) => {
    const { assign_city } = req.body;

    if (!assign_city) {
        return res.status(400).json({ error: "assign_city is required" });
    }

    try {
        let query;
        let values;

        if (assign_city.toLowerCase() === "ahmedabad" || assign_city.toLowerCase() === "gandhinagar") {
            // Return screens for Ahmedabad and Gandhinagar
            query = `SELECT screenid, screenname FROM screens WHERE city IN ('Ahmedabad', 'Gandhinagar')`;
            values = [];
        } else {
            // Return screens only for the requested city
            query = `SELECT screenid, screenname FROM screens WHERE city = $1`;
            values = [assign_city];
        }

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
});



module.exports = router;
