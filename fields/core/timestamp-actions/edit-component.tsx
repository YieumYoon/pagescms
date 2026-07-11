"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useFormContext } from "react-hook-form";

type TimestampFields = {
  date?: string;
  time?: string;
  timezone?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const getLocalTimestamp = () => {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
};

const setFields = (
  setValue: ReturnType<typeof useFormContext>["setValue"],
  fields: TimestampFields,
  values: Partial<ReturnType<typeof getLocalTimestamp>>,
) => {
  Object.entries(fields).forEach(([key, fieldName]) => {
    if (!fieldName) return;
    setValue(fieldName, values[key as keyof typeof values] ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  });
};

const EditComponent = ({ field }: any) => {
  const { setValue } = useFormContext();
  const publishFields: TimestampFields = {
    date: field.options?.publishDateField || "date",
    time: field.options?.publishTimeField || "time",
    timezone: field.options?.publishTimezoneField || "timezone",
  };
  const updatedFields: TimestampFields = {
    date: field.options?.updatedDateField || "updatedDate",
    time: field.options?.updatedTimeField || "updatedTime",
    timezone: field.options?.updatedTimezoneField || "updatedTimezone",
  };

  const setPublishNow = () => setFields(setValue, publishFields, getLocalTimestamp());
  const setUpdatedNow = () => setFields(setValue, updatedFields, getLocalTimestamp());
  const clearPublishTime = () => setFields(setValue, {
    time: publishFields.time,
    timezone: publishFields.timezone,
  }, {
    time: "",
    timezone: "",
  });
  const clearUpdated = () => setFields(setValue, updatedFields, {
    date: "",
    time: "",
    timezone: "",
  });

  return (
    <div className="flex flex-wrap gap-2">
      <ButtonGroup>
        <Button type="button" variant="outline" size="sm" onClick={setPublishNow}>
          Set publish now
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clearPublishTime}>
          Clear publish time
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button type="button" variant="outline" size="sm" onClick={setUpdatedNow}>
          Set updated now
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clearUpdated}>
          Clear updated
        </Button>
      </ButtonGroup>
    </div>
  );
};

export { EditComponent };
