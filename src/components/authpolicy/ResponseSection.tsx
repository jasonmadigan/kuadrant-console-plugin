import { Button, Title } from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon, AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { ResponseSpec, SuccessResponseSpec } from './types';
import DenyWithFields from './DenyWithFields';
import SuccessResponseEntry from './SuccessResponseEntry';
import { useTranslation } from 'react-i18next';

interface ResponseSectionProps {
  response: ResponseSpec;
  onChange: (response: ResponseSpec) => void;
}

const ResponseSection: React.FC<ResponseSectionProps> = ({ response, onChange }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [unauthenticatedExpanded, setUnauthenticatedExpanded] = React.useState(
    !!response.unauthenticated,
  );
  const [unauthorizedExpanded, setUnauthorizedExpanded] = React.useState(!!response.unauthorized);
  const [successExpanded, setSuccessExpanded] = React.useState(!!response.success);

  // success helpers
  const headers = response.success?.headers || {};
  const filters = response.success?.filters || {};

  const updateSuccess = (
    newHeaders: Record<string, SuccessResponseSpec>,
    newFilters: Record<string, SuccessResponseSpec>,
  ) => {
    const hasHeaders = Object.keys(newHeaders).length > 0;
    const hasFilters = Object.keys(newFilters).length > 0;
    const success =
      hasHeaders || hasFilters
        ? {
            headers: hasHeaders ? newHeaders : undefined,
            filters: hasFilters ? newFilters : undefined,
          }
        : undefined;
    onChange({ ...response, success });
  };

  const handleNameChange = (
    map: Record<string, SuccessResponseSpec>,
    oldName: string,
    newName: string,
    isHeaders: boolean,
  ) => {
    const updated: Record<string, SuccessResponseSpec> = {};
    for (const [key, val] of Object.entries(map)) {
      updated[key === oldName ? newName : key] = val;
    }
    if (isHeaders) {
      updateSuccess(updated, filters);
    } else {
      updateSuccess(headers, updated);
    }
  };

  const addSuccessEntry = (isHeaders: boolean) => {
    const map = isHeaders ? headers : filters;
    const prefix = isHeaders ? 'header' : 'filter';
    let name = prefix;
    let i = 1;
    while (map[name]) {
      name = `${prefix}-${i}`;
      i++;
    }
    const newEntry: SuccessResponseSpec = { json: {} };
    if (isHeaders) {
      updateSuccess({ ...headers, [name]: newEntry }, filters);
    } else {
      updateSuccess(headers, { ...filters, [name]: newEntry });
    }
  };

  const removeSuccessEntry = (name: string, isHeaders: boolean) => {
    if (isHeaders) {
      const updated = { ...headers };
      delete updated[name];
      updateSuccess(updated, filters);
    } else {
      const updated = { ...filters };
      delete updated[name];
      updateSuccess(headers, updated);
    }
  };

  return (
    <div>
      <Title headingLevel="h3" size="md">
        {t('Response')}
      </Title>

      <div>
        <Button
          variant="link"
          icon={unauthenticatedExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
          onClick={() => setUnauthenticatedExpanded(!unauthenticatedExpanded)}
        >
          {t('Unauthenticated response')}
        </Button>
        {unauthenticatedExpanded && (
          <DenyWithFields
            deny={response.unauthenticated}
            onChange={(unauthenticated) => onChange({ ...response, unauthenticated })}
          />
        )}
      </div>

      <div>
        <Button
          variant="link"
          icon={unauthorizedExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
          onClick={() => setUnauthorizedExpanded(!unauthorizedExpanded)}
        >
          {t('Unauthorized response')}
        </Button>
        {unauthorizedExpanded && (
          <DenyWithFields
            deny={response.unauthorized}
            onChange={(unauthorized) => onChange({ ...response, unauthorized })}
          />
        )}
      </div>

      <div>
        <Button
          variant="link"
          icon={successExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
          onClick={() => setSuccessExpanded(!successExpanded)}
        >
          {t('Success responses')}
        </Button>
        {successExpanded && (<>
        <Title headingLevel="h4" size="md">
          {t('Headers')}
        </Title>
        {Object.entries(headers).map(([name, spec]) => (
          <div key={name} className="kuadrant-limits-section__entry">
            <SuccessResponseEntry
              name={name}
              spec={spec}
              onNameChange={(newName) => handleNameChange(headers, name, newName, true)}
              onChange={(newSpec) => updateSuccess({ ...headers, [name]: newSpec }, filters)}
            />
            <Button
              variant="link"
              isDanger
              icon={<MinusCircleIcon />}
              onClick={() => removeSuccessEntry(name, true)}
            >
              {t('Remove')}
            </Button>
          </div>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={() => addSuccessEntry(true)}>
          {t('Add header response')}
        </Button>

        <Title headingLevel="h4" size="md" style={{ marginTop: '1rem' }}>
          {t('Filters')}
        </Title>
        {Object.entries(filters).map(([name, spec]) => (
          <div key={name} className="kuadrant-limits-section__entry">
            <SuccessResponseEntry
              name={name}
              spec={spec}
              onNameChange={(newName) => handleNameChange(filters, name, newName, false)}
              onChange={(newSpec) => updateSuccess(headers, { ...filters, [name]: newSpec })}
            />
            <Button
              variant="link"
              isDanger
              icon={<MinusCircleIcon />}
              onClick={() => removeSuccessEntry(name, false)}
            >
              {t('Remove')}
            </Button>
          </div>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={() => addSuccessEntry(false)}>
          {t('Add filter response')}
        </Button>
      </>)}
      </div>
    </div>
  );
};

export default ResponseSection;
