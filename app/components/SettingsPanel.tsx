'use client';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Radio,
  RadioGroup,
  ScrollShadow,
  Select,
  SelectItem
} from '@heroui/react';
import { Dispatch, SetStateAction } from 'react';
import { Region, regions } from '../../config/config';

// Type from parent component
type GenerationOptions = {
  mode: 'questions' | 'answers' | 'all';
  region: string;
  totalCount: number;
  workerCount: number;
  maxQPerWorker: number;
  maxAttempts: number;
  batchSize: number;
  delay: number;
};

type SettingsPanelProps = {
  options: GenerationOptions;
  setOptions: Dispatch<SetStateAction<GenerationOptions>>;
  isRunning: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleStop: () => Promise<void>;
  onAddRegionClick: () => void;
};

/**
 * Settings panel component for configuring generation options
 */
export function SettingsPanel({
  options,
  setOptions,
  isRunning,
  handleSubmit,
  handleStop,
  onAddRegionClick
}: SettingsPanelProps) {
  return (
    <div className="w-full lg:w-[480px] lg:min-w-[480px] flex-shrink-0 animate-in">
      <Card className="h-full rounded-2xl card-glass border border-slate-100 shadow-md">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white/60">
          <h2 className="text-lg font-bold text-slate-800">Generation Settings</h2>
        </CardHeader>
        <CardBody className="p-0">
          <ScrollShadow className="h-[calc(100vh-200px)] px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              {/* Operation Mode */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl">
                <label id="mode-label" className="text-sm font-semibold text-slate-700">Operation Mode</label>
                <RadioGroup
                  value={options.mode}
                  onValueChange={(value) => setOptions(prev => ({ ...prev, mode: value as GenerationOptions['mode'] }))}
                  orientation="horizontal"
                  classNames={{
                    wrapper: "gap-6"
                  }}
                  aria-labelledby="mode-label"
                >
                  <Radio value="questions" className="hover:scale-105 transition-transform">Questions</Radio>
                  <Radio value="answers" className="hover:scale-105 transition-transform">Answers</Radio>
                  <Radio value="all" className="hover:scale-105 transition-transform">All</Radio>
                </RadioGroup>
              </div>

              {/* Region Selection */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Region Selection</label>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={onAddRegionClick}
                    className="font-medium hover:bg-blue-100 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      Add New
                    </span>
                  </Button>
                </div>
                <Select
                  label="Select Region"
                  placeholder="Choose a region"
                  selectedKeys={[options.region]}
                  onChange={(e) => setOptions(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full transition-all"
                  variant="bordered"
                  popoverProps={{
                    placement: "bottom",
                    offset: 5,
                    classNames: {
                      base: "z-[999]"
                    }
                  }}
                  classNames={{
                    trigger: "bg-white shadow-sm border-slate-200 hover:border-blue-200 hover:ring-2 hover:ring-blue-50 transition-all",
                    listbox: "bg-white/95 backdrop-blur-md shadow-lg border-0 overflow-auto rounded-lg",
                    base: "w-full"
                  }}
                >
                  {regions.map((region: Region) => (
                    <SelectItem 
                      key={region.pinyin} 
                      textValue={`${region.name} (${region.pinyin})`}
                      className="data-[hover=true]:bg-blue-50 data-[hover=true]:text-blue-600 data-[selected=true]:bg-blue-100 data-[selected=true]:text-blue-700 py-2 px-3 border-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{region.name} ({region.pinyin})</span>
                        <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{region.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <Divider className="my-2" />

              {/* Numeric Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Total Questions"
                  value={options.totalCount.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, totalCount: parseInt(e.target.value) }))}
                  min={1}
                  variant="bordered"
                  labelPlacement="outside"
                  className="w-full transition-all hover:translate-y-[-1px]"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200",
                    label: "text-slate-700 font-medium"
                  }}
                />

                <Input
                  type="number"
                  label="Worker Count"
                  value={options.workerCount.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, workerCount: parseInt(e.target.value) }))}
                  min={1}
                  max={20}
                  variant="bordered"
                  labelPlacement="outside"
                  className="w-full transition-all hover:translate-y-[-1px]"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200",
                    label: "text-slate-700 font-medium"
                  }}
                />

                <Input
                  type="number"
                  label="Max Questions/Worker"
                  value={options.maxQPerWorker.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxQPerWorker: parseInt(e.target.value) }))}
                  min={1}
                  max={100}
                  variant="bordered"
                  labelPlacement="outside"
                  className="w-full transition-all hover:translate-y-[-1px]"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200",
                    label: "text-slate-700 font-medium"
                  }}
                />

                <Input
                  type="number"
                  label="Max Attempts"
                  value={options.maxAttempts.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) }))}
                  min={1}
                  max={10}
                  variant="bordered"
                  labelPlacement="outside"
                  className="w-full transition-all hover:translate-y-[-1px]"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200",
                    label: "text-slate-700 font-medium"
                  }}
                />

                <Input
                  type="number"
                  label="Batch Size"
                  value={options.batchSize.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                  min={1}
                  max={100}
                  variant="bordered"
                  labelPlacement="outside"
                  className="w-full transition-all hover:translate-y-[-1px]"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200",
                    label: "text-slate-700 font-medium"
                  }}
                />

                <Input
                  type="number"
                  label="Delay (ms)"
                  value={options.delay.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  min={0}
                  step={100}
                  variant="bordered"
                  labelPlacement="outside"
                  className="w-full transition-all hover:translate-y-[-1px]"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200",
                    label: "text-slate-700 font-medium"
                  }}
                />
              </div>

              {/* Submit Button */}
              <Button
                type={isRunning ? "button" : "submit"}
                onPress={isRunning ? handleStop : undefined}
                color={isRunning ? "danger" : "primary"}
                className={`w-full font-medium mt-6 shadow-md transition-all duration-300 ${isRunning ? 'animate-pulse bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:translate-y-[-2px] hover:shadow-lg'}`}
                size="lg"
                variant={isRunning ? "solid" : "solid"}
              >
                {isRunning ? 'Stop Generation' : 'Start Generation'}
              </Button>
            </form>
          </ScrollShadow>
        </CardBody>
      </Card>
    </div>
  );
} 