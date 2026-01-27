import * as React from 'react';
import YAMLPolicyCreatePage from './shared/YAMLPolicyCreatePage';
import { PLAN_POLICY_EXAMPLE } from '../constants/policyExamples';

const KuadrantPlanPolicyCreatePage: React.FC = () => (
  <YAMLPolicyCreatePage
    kind="PlanPolicy"
    exampleName="example-plan-policy"
    exampleSpec={PLAN_POLICY_EXAMPLE}
  />
);

export default KuadrantPlanPolicyCreatePage;
