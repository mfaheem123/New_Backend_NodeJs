// controllers/authorization.controller.js
const AuthModel = require('../models/authorizationModel');

const create = async (req, res) => {
    try {
        const { role_id } = req.body;

        const data = await AuthModel.createAuthorization(role_id);

        res.json({ status: true, data });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getByRole = async (req, res) => {
    try {
        const { role_id } = req.params;

        const data = await AuthModel.getByRoleId(role_id);

        if (!data) {
            return res.status(404).json({ status: false, message: "Not found" });
        }

        // role object
        const role = {
            id: data.role_id,
            name: data.role_name
        };

        // permissions object (role_name remove)
        const { role_name, ...permissions } = data;

        // role ko permissions ke andar inject karo
        permissions.role = role;

        res.json({
            status: true,
            permissions
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { role_id } = req.params;

        const data = await AuthModel.updateAuthorization(role_id, req.body);

        res.json({ status: true, data });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const { role_id } = req.params;

        await AuthModel.deleteAuthorization(role_id);

        res.json({ status: true, message: "Deleted successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    create,
    getByRole,
    update,
    remove
};