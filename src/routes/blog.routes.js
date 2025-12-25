import { Router } from "express";
import {createBlog,
        updateBlog,
        getAllBlogs,
        getBySlug,
} from "../controllers/blog.controller.js";

const router = Router();

router.route('/blog')
    .post(createBlog)
    .get(getAllBlogs);

router.route('/blog/:slug')
    .put(updateBlog)
    .get(getBySlug)
    // .patch()
    
export default router;