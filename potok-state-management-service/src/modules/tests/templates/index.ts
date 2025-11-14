import { ENERGY_TEST } from './energy.test';
import { FOCUS_TEST } from './focus.test';
import { MOTIVATION_TEST } from './motivation.test';
import { STRESS_TEST } from './stress.test';
import { TestType } from '../../../common/enums/test-type.enum';
import { TestStructure } from '../../../common/interfaces/test-structure.interface';

export const TEST_TEMPLATES: Record<TestType, TestStructure> = {
  [TestType.ENERGY]: ENERGY_TEST,
  [TestType.FOCUS]: FOCUS_TEST,
  [TestType.MOTIVATION]: MOTIVATION_TEST,
  [TestType.STRESS]: STRESS_TEST,
};
