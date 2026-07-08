const Model = require("../models/documentNumberModel");

/* CREATE */
exports.create = async (req, res) => {
  try {
console.log(
      "🚀 ADD DOCUMENT NUMBER BODY:",
      JSON.stringify(req.body, null, 2),
    );
const {
      subsidiary_id,
      document_table,
      document_column,
    } = req.body;
    if (!subsidiary_id){
    return res.status(400).json({ status: false, message: "subsidiary_id is required" });
}
if (!document_table)
  {
    return res.status(400).json({ status: false, message: "document_table is required" });
}


if (!document_column)
  {
    return res.status(400).json({ status: false, message: "document_column is required" });
}

    const doc = await Model.create(req.body);
    res.json({ status: true, document_number: doc });
  } catch(err){

   if(err.message=="Document number already exists."){
      return res.status(400).json({
          status:false,
          message:err.message
      })
   }

   res.status(500).json({
      status:false,
      message:err.message
   })

}
};

/* GET ALL */
exports.getAll = async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);
    const limit = Number(req.query.limit || 10);
    const {company_id} = req.query;
    console.log(req.query)

    const result = await Model.getAll({ offset, limit, company_id });

    res.json({
      status: true,
      count: result.count,
      document_numbers: result.rows,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

/* GET BY ID */
exports.getById = async (req, res) => {
  try {
    const doc = await Model.getById(req.params.id);
    if (!doc) {
      return res.status(404).json({ status: false, message: "Not found" });
    }
    res.json({ status: true, document_number: doc });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

/* UPDATE */
exports.update = async (req, res) => {
  try {
    const doc = await Model.update(req.params.id, req.body);
    res.json({ status: true, document_number: doc });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

/* DELETE */
exports.remove = async (req, res) => {
  try {
    const doc = await Model.remove(req.params.id);
    if (!doc) {
      return res.status(404).json({ status: false, message: "Not found" });
    }
    res.json({ status: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
