import { Router } from "express";
import {createBlog,
        updateBlog,
        getAllBlogs,
        getBySlug,
        toggle,
} from "../controllers/blog.controller.js";
import { s3Uploader } from "../middleware/uploads.js";
import authMiddleware from "../middleware/auth.js";
import {isAdmin} from '../middleware/role.js';

const router = Router();

router.route('/blog')
    .post(authMiddleware, isAdmin , s3Uploader().fields([{ name: "blogImage", maxCount: 1 }]), createBlog)
    .get(getAllBlogs);

router.route('/blog/:slug')
    .put(authMiddleware, isAdmin , s3Uploader().fields([{ name: "blogImage", maxCount: 1 }]), updateBlog)
    .get(getBySlug)
    .patch(authMiddleware, isAdmin ,toggle)
    
export default router;



