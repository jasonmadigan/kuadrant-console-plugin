import * as React from 'react';
import { useParams } from 'react-router-dom';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  Page,
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Text
} from '@patternfly/react-core';
import { Divider, Flex, FlexItem } from '@patternfly/react-core';
import { useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import './kuadrant.css';
import { GlobeIcon, ReplicatorIcon, OptimizeIcon, ArrowRightIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';

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
          <br />
          <Card>
            <CardTitle><Title headingLevel="h2">Getting started resources</Title></CardTitle>
            <CardBody>
              <Flex>
                <FlexItem flex={{ default: 'flex_1' }}>
                  <Title headingLevel="h4" className="kuadrant-dashboard-learning">
                    <GlobeIcon /> Learning Resources
                  </Title>
                  <p>Learn how to create, import and use {t('Kuadrant')} policies on OpenShift with step-by-step instructions and tasks.</p>
                  <br />
                  <Text component="a" href="/kuadrant/all-namespaces/policies" className="kuadrant-dashboard-resource-link">
                    Create Policies in {t('Kuadrant')} <ArrowRightIcon />
                  </Text>
                  <br />
                  <Text component="a" href={`/k8s/ns/${activeNamespace}/gateway.networking.k8s.io~v1~Gateway/~new`} className="kuadrant-dashboard-resource-link"                   >
                    Add a new Gateway <ArrowRightIcon />
                  </Text>
                </FlexItem>
                <Divider orientation={{ default: 'vertical' }} />
                <FlexItem flex={{ default: 'flex_1' }}>
                  <Title headingLevel="h4" className="kuadrant-dashboard-feature-highlights">
                    <OptimizeIcon /> Feature Highlights
                  </Title>
                  <p>Read about the latest information and key features in the {t('Kuadrant')} highlights.</p>
                  <br/>
                  <Text target='_blank' component="a" href="#" className="kuadrant-dashboard-resource-link">
                    {t('Kuadrant')} highlights <ExternalLinkAltIcon />
                  </Text>
                  <br/>
                  {/* TODO: portal link */}
                  <Text target='_blank' component="a" href="https://access.redhat.com/articles/7065949" className="kuadrant-dashboard-resource-link">
                    {t('Kuadrant')} Release Notes 
                    {/* TODO: class for these */}
                    <span style={{ fontSize: '0.8rem', color: 'gray', marginLeft: '8px', marginRight: '8px' }}>
                      8 min read
                    </span> 
                    <ExternalLinkAltIcon />
                  </Text>
                </FlexItem>
                <Divider orientation={{ default: 'vertical' }} />
                <FlexItem flex={{ default: 'flex_1' }}>
                  <Title headingLevel="h4" className="kuadrant-dashboard-enhance">
                    <ReplicatorIcon /> Enhance Your Work
                  </Title>
                  <p>Ease operational complexity with API management and App Connectivity by using additional Operators and tools.</p>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>
        </PageSection>
      </Page>
    </>
  );
};

export default KuadrantOverviewPage;
