'use client';

import { useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
  title?: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  children?: React.ReactNode;
  lastImportEndDate?: string;
  showAllTime?: boolean;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type DateRangeType =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'last6Months'
  | 'lastYear'
  | 'allTime'
  | 'sinceLastImport';

export function DateRangePicker({
  title,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  children,
  lastImportEndDate,
  showAllTime = false,
}: DateRangePickerProps) {
  // Helper to compute date range for a preset
  const getPresetDates = useCallback((type: DateRangeType): { start: string; end: string } => {
    const today = new Date();
    let start: Date, end: Date;

    switch (type) {
      case 'today':
        start = end = new Date(today);
        break;
      case 'yesterday':
        start = end = new Date(today);
        start.setDate(today.getDate() - 1);
        break;
      case 'thisWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(today);
        break;
      case 'lastWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last3Months':
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        end = new Date(today);
        break;
      case 'last6Months':
        start = new Date(today);
        start.setMonth(today.getMonth() - 6);
        end = new Date(today);
        break;
      case 'lastYear':
        start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        end = new Date(today);
        break;
      case 'allTime':
        start = new Date(2000, 0, 1);
        end = new Date(today);
        break;
      case 'sinceLastImport':
        if (lastImportEndDate) {
          start = new Date(lastImportEndDate);
          end = new Date(today);
        } else {
          start = end = new Date(today);
        }
        break;
    }

    return { start: formatDate(start), end: formatDate(end) };
  }, [lastImportEndDate]);

  const setDateRange = useCallback(
    (type: DateRangeType) => {
      const { start, end } = getPresetDates(type);
      onStartDateChange(start);
      onEndDateChange(end);
    },
    [onStartDateChange, onEndDateChange, getPresetDates]
  );

  // Detect which preset matches the current dates
  const currentPreset = useMemo((): DateRangeType | undefined => {
    const presets: DateRangeType[] = [
      'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth',
      'last3Months', 'last6Months', 'lastYear',
      ...(showAllTime ? ['allTime' as DateRangeType] : []),
      ...(lastImportEndDate ? ['sinceLastImport' as DateRangeType] : []),
    ];

    for (const preset of presets) {
      const { start, end } = getPresetDates(preset);
      if (start === startDate && end === endDate) {
        return preset;
      }
    }
    return undefined;
  }, [startDate, endDate, showAllTime, lastImportEndDate, getPresetDates]);

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        <div className="flex gap-6 items-end flex-wrap">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Quick Select</label>
            <Select value={currentPreset || ''} onValueChange={(v) => setDateRange(v as DateRangeType)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select range..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last3Months">Last 3 Months</SelectItem>
                <SelectItem value="last6Months">Last 6 Months</SelectItem>
                <SelectItem value="lastYear">Last Year</SelectItem>
                {showAllTime && <SelectItem value="allTime">All Time</SelectItem>}
                {lastImportEndDate && (
                  <SelectItem value="sinceLastImport">Since Last Import</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
