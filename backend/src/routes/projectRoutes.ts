import { Router } from 'express';
import { listProjects, getProject, renameProject } from '../controllers/projectController';

const router = Router();

router.get('/', listProjects);
router.get('/:id', getProject);
router.put('/:id', renameProject);

export default router;
