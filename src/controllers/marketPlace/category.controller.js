import { getCategoryTreeService } from '../../services/category.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';


export const getCategoryTree = async (req, res, next) => {
    try {
        const categoryTree = await getCategoryTreeService();

        return res.status(200).json(
            new ApiResponse(200, categoryTree, 'Category tree fetched successfully')
        );
    } catch (error) {
        next(error);
    }
};
