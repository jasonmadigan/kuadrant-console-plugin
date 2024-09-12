import * as React from 'react';
import { useParams } from 'react-router-dom';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  Page,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { Divider, Flex, FlexItem } from '@patternfly/react-core';
import { useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import './kuadrant.css';
import { GlobeIcon, MagicIcon, BoxesIcon } from '@patternfly/react-icons';


const KuadrantOverviewPage: React.FC = () => {
  const { t } = useTranslation('plugin__console-plugin-template');
  const { ns } = useParams<{ ns: string }>();
  const [activeNamespace, setActiveNamespace] = useActiveNamespace();

  React.useEffect(() => {
    if (ns && ns !== activeNamespace) {
      setActiveNamespace(ns);
    }
    console.log(`Initial namespace: ${activeNamespace}`);
  }, [ns, activeNamespace, setActiveNamespace]);

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">{t('Kuadrant')}</title>
      </Helmet>
      <Page>
        <PageSection variant="light">
          <Title headingLevel="h1">{t('Kuadrant')} Overview</Title>
          <br/>
          <Flex>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Title headingLevel="h4" className="kuadrant-dashboard-learning"><GlobeIcon /> Learning Resources</Title>
              <p>Learn how to create, import and use {t('Kuadrant')} policies on OpenShift with step-by-step instructions.</p>
            </FlexItem>
            <Divider orientation={{ default: 'vertical' }} />
            <FlexItem flex={{ default: 'flex_1' }}>
              <Title headingLevel="h4" className="kuadrant-dashboard-feature-highlights"><MagicIcon /> Feature Highlights</Title>
              <p>Read about the latest information and key features in the Connectivity Link highlights.</p>
            </FlexItem>
            <Divider orientation={{ default: 'vertical' }} />
            <FlexItem flex={{ default: 'flex_1' }}>
              <Title headingLevel="h4" className="kuadrant-dashboard-enhance"><BoxesIcon /> Enhance Your Work</Title>
              <p>Ease operational complexity with API management and App Connectivity by using additional Operators and tools.</p>
            </FlexItem>
          </Flex>
          <Divider />
        </PageSection>

      </Page>
    </>
  );
};

export default KuadrantOverviewPage;
