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
  Text,
  Stack,
  StackItem
} from '@patternfly/react-core';
import { Divider, Flex, FlexItem } from '@patternfly/react-core';
import { useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import './kuadrant.css';
import { GlobeIcon, ReplicatorIcon, OptimizeIcon, ArrowRightIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';

import { AllPoliciesListPage } from './KuadrantPoliciesPage';

import { INTERNAL_LINKS, EXTERNAL_LINKS } from '../constants/links';

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
                  <Stack hasGutter className="pf-u-mt-md">
                    <StackItem>
                      <Text component="a" href={INTERNAL_LINKS.createPolicies} className="kuadrant-dashboard-resource-link">
                        Create Policies in {t('Kuadrant')} <ArrowRightIcon />
                      </Text>
                    </StackItem>
                    <StackItem>
                      <Text component="a" href={INTERNAL_LINKS.addNewGateway(activeNamespace)} className="kuadrant-dashboard-resource-link">
                        Add a new Gateway <ArrowRightIcon />
                      </Text>
                    </StackItem>
                    <StackItem>
                      <Text component="a" href={EXTERNAL_LINKS.documentation} className="pf-u-display-block">
                        View Documentation
                      </Text>
                    </StackItem>
                    <StackItem>
                      <Text component="a" href={EXTERNAL_LINKS.quickStarts} className="pf-u-display-block">
                        View all quick starts
                      </Text>
                    </StackItem>
                  </Stack>
                </FlexItem>
                <Divider orientation={{ default: 'vertical' }} />
                <FlexItem flex={{ default: 'flex_1' }}>
                  <Title headingLevel="h4" className="kuadrant-dashboard-feature-highlights">
                    <OptimizeIcon /> Feature Highlights
                  </Title>
                  <p>Read about the latest information and key features in the {t('Kuadrant')} highlights.</p>
                  <Stack hasGutter className="pf-u-mt-md">
                    <StackItem>
                      <Text target='_blank' component="a" href="#" className="kuadrant-dashboard-resource-link">
                        {t('Kuadrant')} highlights&nbsp;&nbsp;<ExternalLinkAltIcon />
                      </Text>
                    </StackItem>
                    <StackItem>
                      {/* TODO: portal link */}
                      <Text target='_blank' component="a" href={EXTERNAL_LINKS.releaseNotes} className="kuadrant-dashboard-resource-link">
                        {t('Kuadrant')} Release Notes
                        {/* TODO: class for these */}
                        <span className="kuadrant-reading-time">
                          6 min read
                        </span>
                        <ExternalLinkAltIcon />
                      </Text>
                    </StackItem>
                    <StackItem>
                      <Text component="a" href={EXTERNAL_LINKS.blog} className="pf-u-display-block">
                        Visit the blog
                      </Text>
                    </StackItem>
                  </Stack>
                </FlexItem>
                <Divider orientation={{ default: 'vertical' }} />
                <FlexItem flex={{ default: 'flex_1' }}>
                  <Title headingLevel="h4" className="kuadrant-dashboard-enhance">
                    <ReplicatorIcon /> Enhance Your Work
                  </Title>
                  <p>Ease operational complexity with API management and App Connectivity by using additional Operators and tools.</p>
                  <Stack hasGutter className="pf-u-mt-md">
                    <StackItem>
                      <Text component="a" href={INTERNAL_LINKS.apiDesignerOperator(activeNamespace)} className="kuadrant-dashboard-resource-link">
                        API Designer Operator <ArrowRightIcon />
                      </Text>
                    </StackItem>
                    <StackItem>
                      <Text component="a" href={INTERNAL_LINKS.observabilitySetup} className="kuadrant-dashboard-resource-link">
                        Observability for {t('Kuadrant')} <ArrowRightIcon />
                      </Text>
                    </StackItem>
                    <StackItem>
                      <Text component="a" href={INTERNAL_LINKS.certManagerOperator(activeNamespace)} className="kuadrant-dashboard-resource-link">
                        cert-manager Operator <ArrowRightIcon />
                      </Text>
                    </StackItem>
                  </Stack>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>


          <Flex className="pf-u-mt-xl">
            <FlexItem flex={{ default: 'flex_1' }}>
              <Card >
                <CardTitle><Title headingLevel="h2">Policies</Title></CardTitle>
                <CardBody>
                  <AllPoliciesListPage activeNamespace='#ALL_NS#' />
                </CardBody>
              </Card>
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1'}}>
              <Card >
                <CardTitle><Title headingLevel="h2">Alerts</Title></CardTitle>
                <CardBody>
                  me alerts
                </CardBody>
              </Card>
            </FlexItem>
          </Flex>

          <Flex className="pf-u-mt-xl">
            <FlexItem flex={{ default: 'flex_1' }}>
              <Card >
                <CardTitle><Title headingLevel="h2">Gateways</Title></CardTitle>
                <CardBody>
                  me gateways
                </CardBody>
              </Card>
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1'}}>
              <Card >
                <CardTitle><Title headingLevel="h2">APIs / HTTPRoutes</Title></CardTitle>
                <CardBody>
                  me APIs
                </CardBody>
              </Card>
            </FlexItem>
          </Flex>

        </PageSection>
      </Page>
    </>
  );
};

export default KuadrantOverviewPage;
