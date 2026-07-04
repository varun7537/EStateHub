// backend/src/controllers/propertyStatsController.js
// NOTE: If you already have a propertyController.js with CRUD for properties,
// just move this one function into that file instead of using a new file.
const pool = require("../config/db");

// GET all properties posted by the logged-in user (buyer/agent/builder can all post)
module.exports.getMyProperties = async (req, res) => {
    try {
        const userId = req.user.id;
        const status = req.query.status; // optional filter: active | sold | pending | draft

        let query = "SELECT * FROM properties WHERE owner_id = ?";
        const params = [userId];

        if (status) {
            query += " AND status = ?";
            params.push(status);
        }

        query += " ORDER BY created_at DESC";

        const [properties] = await pool.query(query, params);

        res.json({ properties, count: properties.length });
    } catch (err) {
        console.error("Get my properties error:", err);
        res.status(500).json({
            message: "Server error fetching your properties",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};