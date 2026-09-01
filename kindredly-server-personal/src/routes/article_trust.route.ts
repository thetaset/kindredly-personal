import {Routes} from '@interfaces/routes.interface';
import {Router} from 'express';
import {ApiReq} from '@/types/api-types';
import {authenticateJWT, errorHelper} from '../utils/auth_utils';
import {ArticleAnalysisService} from '@/services/article_analysis.service';

/**
 * Article-trust route. Source-reputation lookup + rule-based analysis, owned by
 * us and non-LLM by default. The client sends rendered HTML (SPA-safe); the
 * backend does the extraction and analysis. Non-articles return status
 * 'no-article' rather than a negative verdict.
 */
class ArticleTrustRoute implements Routes {
  public router = Router();

  private articleAnalysisService = ArticleAnalysisService.instance;

  constructor() {
    console.info(`Initializing routes ${this.constructor.name}`);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/article/analyze',
      authenticateJWT,
      errorHelper(async (req: ApiReq<'/article/analyze'>, res) => {
        const result = await this.articleAnalysisService.analyze(req.body);
        res.json({success: true, results: result});
      }),
    );
  }
}

export default ArticleTrustRoute;
