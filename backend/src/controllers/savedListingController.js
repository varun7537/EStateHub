// backend/src/controllers/savedListingController.js
const pool = require("../config/db");

// GET all saved listings for the logged-in user
module.exports.getSavedListings = async (req, res) => {
    try {
        const userId = req.user.id;

        const [saved] = await pool.query(
            `SELECT sp.id AS saved_id, sp.created_at AS saved_at, p.*
             FROM saved_properties sp
             JOIN properties p ON sp.property_id = p.id
             WHERE sp.user_id = ?
             ORDER BY sp.created_at DESC`,
            [userId]
        );

        res.json({ savedListings: saved, count: saved.length });
    } catch (err) {
        console.error("Get saved listings error:", err);
        res.status(500).json({
            message: "Server error fetching saved listings",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// POST - save a property to wishlist
module.exports.saveListing = async (req, res) => {
    try {
        const userId = req.user.id;
        const { propertyId } = req.body;

        if (!propertyId) {
            return res.status(400).json({ message: "propertyId is required" });
        }

        // Make sure property actually exists
        const [property] = await pool.query(
            "SELECT id FROM properties WHERE id = ?",
            [propertyId]
        );

        if (property.length === 0) {
            return res.status(404).json({ message: "Property not found" });
        }

        try {
            await pool.query(
                "INSERT INTO saved_properties (user_id, property_id, created_at) VALUES (?, ?, NOW())",
                [userId, propertyId]
            );
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: "Property is already in your saved listings" });
            }
            throw err;
        }

        res.status(201).json({ message: "Property added to saved listings" });
    } catch (err) {
        console.error("Save listing error:", err);
        res.status(500).json({
            message: "Server error saving listing",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// DELETE - remove a property from wishlist
module.exports.unsaveListing = async (req, res) => {
    try {
        const userId = req.user.id;
        const { propertyId } = req.params;

        const [result] = await pool.query(
            "DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?",
            [userId, propertyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Saved listing not found" });
        }

        res.json({ message: "Property removed from saved listings" });
    } catch (err) {
        console.error("Unsave listing error:", err);
        res.status(500).json({
            message: "Server error removing saved listing",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};