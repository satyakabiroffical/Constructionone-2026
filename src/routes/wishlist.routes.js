import express from "express";
import  {Router} from  express
import {removeFromWishlist ,getWishlist ,addToWishlist} from "../controllers/wishlist.controller.js"

const router = Router()

router.router("/wishlist").post(addToWishlist).get(getWishlist)
router.router("/wishlist/:id").delete(removeFromWishlist)

export default router;