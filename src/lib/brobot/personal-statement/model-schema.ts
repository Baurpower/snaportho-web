import { zodResponseFormat } from 'openai/helpers/zod';
import { PersonalStatementComparisonSchema, PersonalStatementReviewSchema } from './types';

export const PERSONAL_STATEMENT_JSON_SCHEMA = zodResponseFormat(PersonalStatementReviewSchema, 'personal_statement_review_v2');
export const PERSONAL_STATEMENT_COMPARISON_JSON_SCHEMA = zodResponseFormat(PersonalStatementComparisonSchema, 'personal_statement_comparison_v1');
