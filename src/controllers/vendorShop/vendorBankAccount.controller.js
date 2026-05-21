import VendorBankAccount from "../../models/vendorShop/vendorBankAccount.model.js";
import redisCache from "../../utils/redisCache.js";
export const addBankAccount = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      accountType,
      upiId,
    } = req.body;

    let cancelledCheque = "";

    if (req.files?.cancelledCheque) {
      cancelledCheque = req.files.cancelledCheque[0].location;
    }

    // check if vendor already has default bank
    const existingDefault = await VendorBankAccount.findOne({
      vendorId,
      isDefault: true,
    });

    // check duplicate account / ifsc / upi
    const duplicateConditions = [];

    if (accountNumber && ifscCode) {
      duplicateConditions.push({
        accountNumber,
        ifscCode,
      });
    }

    if (upiId) {
      duplicateConditions.push({
        upiId,
      });
    }

    const existingBank = await VendorBankAccount.findOne({
      $or: duplicateConditions,
    });

    if (existingBank) {
      return res.status(400).json({
        success: false,
        message:
          "Bank account with same number, IFSC, or UPI ID already exists",
      });
    }

    const bank = await VendorBankAccount.create({
      vendorId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      accountType,
      upiId,
      cancelledCheque,
      isDefault: existingDefault ? false : true,
    });

    // Clear Redis cache for this vendor's bank accounts
    await redisCache.deletePattern(`vendor:${vendorId}:bankAccounts:*`);

    return res.status(201).json({
      success: true,
      message: "Bank added successfully",
      data: bank,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
// export const getVendorBankAccounts = async (req, res) => {
//   try {
//     const vendorId = req.user.id;
//     // const vendorId = "69e0ba37e0de9730ed927351"
//     console.log("Fetching bank accounts for vendorId:", vendorId);
//     const accounts = await VendorBankAccount.find({
//       vendorId,
//     });

//     res.status(200).json({
//       success: true,
//       data: accounts,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

export const getVendorBankAccounts = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // query params
    // type=upi OR type=bank
    const { type } = req.query;

    const cacheKey = `vendor:${vendorId}:bankAccounts:${type || "all"}`;

    // get cache
    const cachedData = await redisCache.get(cacheKey);

    if (cachedData) {
      console.log("Serving bank accounts from cache for vendorId:", vendorId);
      return res.status(200).json({
        success: true,
        source: "cache",
        count: JSON.parse(cachedData).length,
        data: JSON.parse(cachedData),
      });
    }

    let filter = {
      vendorId,
    };

    // filter based on type
    if (type === "upi") {
      filter.upiId = {
        $exists: true,
        $nin: [null, ""],
      };
    }

    if (type === "bank") {
      filter.accountNumber = {
        $exists: true,
        $nin: [null, ""],
      };
    }

    const accounts = await VendorBankAccount.find(filter).sort({
      createdAt: -1,
    });

    await redisCache.set(cacheKey, JSON.stringify(accounts)); // cache for 1 hour

    return res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteBankAccount = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const account = await VendorBankAccount.findById(id);

    const wasDefault = account.isDefault;

    // deactivate
    await VendorBankAccount.findByIdAndDelete(id, {
      isActive: false,
      isDefault: false,
    });

    if (wasDefault) {
      const another = await VendorBankAccount.findOne({
        vendorId,
        isActive: true,
      });

      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }
    await redisCache.deletePattern(`vendor:${vendorId}:bankAccounts:*`);

    res.status(200).json({
      success: true,
      message: "Bank removed",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const setDefaultBankAccount = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { bankAccountId } = req.body;

    const accounts = await VendorBankAccount.find({
      vendorId,
      isActive: true,
    });

    if (accounts.length === 1) {
      return res.status(200).json({
        success: true,
        message: "Only one account, already default",
      });
    }

    // reset all
    await VendorBankAccount.updateMany(
      { vendorId },
      { $set: { isDefault: false } },
    );

    // set selected
    const updated = await VendorBankAccount.findByIdAndUpdate(
      bankAccountId,
      { isDefault: true },
      { new: true },
    );
    await redisCache.deletePattern(`vendor:${vendorId}:bankAccounts:*`);
    res.status(200).json({
      success: true,
      message: "Default bank updated",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBankAccount = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      accountType,
      upiId,
    } = req.body;

    // check bank exists & belongs to vendor
    const bank = await VendorBankAccount.findOne({
      _id: id,
      vendorId,
    });

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    // handle file upload
    let cancelledCheque = bank.cancelledCheque;
    if (req.files?.cancelledCheque) {
      cancelledCheque = req.files.cancelledCheque[0].location;
    }

    // update fields (only if provided)
    bank.accountHolderName = accountHolderName || bank.accountHolderName;
    bank.accountNumber = accountNumber || bank.accountNumber;
    bank.ifscCode = ifscCode || bank.ifscCode;
    bank.bankName = bankName || bank.bankName;
    bank.accountType = accountType || bank.accountType;
    bank.upiId = upiId || bank.upiId;
    bank.cancelledCheque = cancelledCheque;

    await bank.save();
    await redisCache.deletePattern(`vendor:${vendorId}:bankAccounts:*`);
    return res.status(200).json({
      success: true,
      message: "Bank account updated successfully",
      data: bank,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};
