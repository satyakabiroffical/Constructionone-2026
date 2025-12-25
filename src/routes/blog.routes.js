import { Router } from "express";
import {createBlog,
        updateBlog,
        getAllBlogs,
        getBySlug,
        toggle,
} from "../controllers/blog.controller.js";
import { s3Uploader } from "../middleware/uploads.js";

const router = Router();

router.route('/blog')
    .post( s3Uploader().fields([{ name: "blogImage", maxCount: 1 }]), createBlog)
    .get(getAllBlogs);

router.route('/blog/:slug')
    .put( s3Uploader().fields([{ name: "blogImage", maxCount: 1 }]), updateBlog)
    .get(getBySlug)
    .patch(toggle)
    
export default router;



