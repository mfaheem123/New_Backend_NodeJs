const Complaint = require("../models/complaintModel");
const db = require("../db");

async function generateReference(id) {
  await db.query(
    `
UPDATE complaints
SET reference_number=$1
WHERE id=$2
`,
    [`NTG${id}`, id],
  );
}

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD CUSTOMER COMPLAINT BODY:",
      JSON.stringify(req.body, null, 2)
    );

    const complaint =
      await Complaint.createComplaint(req.body);

    await generateReference(complaint.id);

    // FIX
    const data =
      await Complaint.getComplaintById(
        complaint.id
      );

    return res.status(201).json({
      status: true,
      complaint: data,
    });

  } catch (err) {
    console.error("ADD COMPLAINT ERROR:", err);

    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getAll = async (req, res) => {
  const offset = Number(req.query.offset) || 0;

  const limit = Number(req.query.limit) || 100;

  const complaints = await Complaint.getAllComplaints(offset, limit);

  res.json({
    status: true,
    count: complaints.length,
    complaints,
  });
};

exports.getById = async (req, res) => {
  const data = await Complaint.getComplaintById(req.query.id);

  res.json({
    status: true,
    complaint: data,
  });
};

exports.update = async (req, res) => {
  const result = await Complaint.updateComplaint(req.params.id, req.body);

  res.json({
    status: true,
    complaint: result,
  });
};

exports.delete = async (req, res) => {
  await Complaint.deleteComplaint(req.params.id);

  res.json({
    status: true,
    message: "Complaint deleted",
  });
};
