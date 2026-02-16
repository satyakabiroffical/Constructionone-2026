import Address from "../../models/user/address.model.js";

export const createAddress = async (req, res, next) => {
  try {
    const address = await Address.create(req.body);
    res.status(201).json(address);
  } catch (error) {
    next(error);
  }
};

export const getAddressesByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const addresses = await Address.find({ userId });
    res.json(addresses);
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(address);
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    await Address.findByIdAndDelete(req.params.id);
    res.json({ message: "Address deleted" });
  } catch (error) {
    next(error);
  }
};

//asgr
