import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Content, ContentVariants, Label, Popover } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  BuildIcon,
  UploadIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';

const StatusLegend: React.FC = () => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');

  return (
    <Popover
      headerContent={t('Status')}
      bodyContent={
        <>
          <Content component={ContentVariants.p}>
            {t(
              'It indicates the current operational state of the Gateway and reflects whether its configuration is applied and functioning correctly.',
            )}
          </Content>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 8,
              rowGap: 8,
              alignItems: 'center',
              justifyItems: 'start',
            }}
          >
            <Label isCompact color="green" icon={<CheckCircleIcon />}>
              {' '}
              {t('Enforced')}{' '}
            </Label>
            <span style={{ fontSize: 12 }}>
              {t('Resource is accepted, configured, and all policies are enforced.')}
            </span>

            <Label isCompact color="purple" icon={<UploadIcon />}>
              {' '}
              {t('Accepted ')}{' '}
            </Label>
            <span style={{ fontSize: 12 }}>
              {t('Resource is accepted, but not all policies are enforced.')}
            </span>

            <Label isCompact color="blue" icon={<BuildIcon />}>
              {' '}
              {t('Programmed')}{' '}
            </Label>
            <span style={{ fontSize: 12 }}>
              {t('Resource is being configured but not yet enforced.')}
            </span>

            <Label isCompact color="red" icon={<ExclamationCircleIcon />}>
              {' '}
              {t('Conflicted')}{' '}
            </Label>
            <span style={{ fontSize: 12 }}>
              {t('Resource has conflicts, possibly due to policies or configuration issues.')}
            </span>

            <Label isCompact color="red" icon={<ExclamationCircleIcon />}>
              {' '}
              {t('Resolved')}{' '}
            </Label>
            <span style={{ fontSize: 12 }}>
              {t('All dependencies for the policy are successfully resolved.')}
            </span>
          </div>
        </>
      }
      triggerAction="hover"
      position="top"
    >
      <QuestionCircleIcon style={{ marginLeft: 6, cursor: 'help' }} aria-label="Status help" />
    </Popover>
  );
};

export default StatusLegend;
