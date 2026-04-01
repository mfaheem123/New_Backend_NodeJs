const model = require("../models/lostPropertyModel");

/* CREATE */
exports.create = async (req, res) => {
  try {
    const lostProperty = await model.createLostProperty(req.body);

    res.json({
      status: true,
      lost_property: lostProperty,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* GET ALL */
exports.getAll = async (req, res) => {
  try {
    const data = await model.getAllLostProperties();

    res.json({
      status: true,
      count: data.length,
      lost_properties: data.map((item) => ({
        id: item.id,
        lost_number: item.lost_number,
        report_date: item.report_date,
        lost_date: item.lost_date,
        item_description: item.item_description,
        customer: {
          name: item.customer_name,
        },
      })),
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* GET BY ID */
exports.getById = async (req, res) => {
  try {
    const data = await model.getLostPropertyById(req.query.id);

    res.json({
      status: true,
      lost_property: {
        ...data,
        booking: {
          reference_number: data.reference_number,
          pickup_date: data.pickup_date,
          pickup_time: data.pickup_time,
          pickup: data.pickup,
          dropoff: data.dropoff,
          vehicle_type: {
            name: data.vehicle_type_name,
          },
        },
        customer: {
          name: data.customer_name,
          mobile: data.mobile,
          door_number: data.door_number,
          address1: data.address1,
          address2: data.address2,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* UPDATE */
exports.update = async (req, res) => {
  try {
    const data = await model.updateLostProperty(req.params.id, req.body);

    res.json({
      status: true,
      lost_property: data,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* DELETE */
exports.delete = async (req, res) => {
  try {
    await model.deleteLostProperty(req.params.id);

    res.json({
      status: true,
      message: "Customer Lost Property Delete Successfully",
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
