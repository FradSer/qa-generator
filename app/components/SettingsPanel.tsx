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
    <div className="w-full lg:w-[480px] lg:min-w-[480px] flex-shrink-0 animate-in slide-in-from-left-5 duration-700 ease-out mb-6 lg:mb-0">
      <Card className="h-full rounded-2xl border border-slate-200/70 shadow-md bg-white/95 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/70">
        <CardHeader className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2.5">
            <i className="ri-settings-line text-blue-600"></i>
            Generation Settings
          </h2>
        </CardHeader>
        <CardBody className="p-6 lg:flex-1 lg:overflow-hidden">
          <ScrollShadow className="h-full max-h-[600px] lg:max-h-full">
            <form onSubmit={handleSubmit} className="space-y-7 py-5 px-6">
              {/* Operation Mode */}
              <div className="space-y-3 bg-slate-50/80 p-5 rounded-xl shadow-sm border border-slate-100">
                <label id="mode-label" className="text-sm font-semibold text-slate-600 flex items-center gap-2.5">
                  <i className="ri-list-check-2 text-blue-600"></i>
                  Operation Mode
                </label>
                <RadioGroup
                  value={options.mode}
                  onValueChange={(value) => setOptions(prev => ({ ...prev, mode: value as GenerationOptions['mode'] }))}
                  orientation="horizontal"
                  classNames={{
                    wrapper: "gap-6",
                    base: "border-blue-200 data-[selected=true]:border-blue-500 transition-all duration-200",
                    label: "text-slate-600 font-medium"
                  }}
                  aria-labelledby="mode-label"
                >
                  <Radio 
                    value="questions" 
                    className="transition-transform duration-200 ease-out hover:scale-102 active:scale-98"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500 transition-colors duration-200",
                      label: "text-slate-600 font-medium"
                    }}
                  >
                    Questions
                  </Radio>
                  <Radio 
                    value="answers" 
                    className="transition-transform duration-200 ease-out hover:scale-102 active:scale-98"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500 transition-colors duration-200",
                      label: "text-slate-600 font-medium"
                    }}
                  >
                    Answers
                  </Radio>
                  <Radio 
                    value="all" 
                    className="transition-transform duration-200 ease-out hover:scale-102 active:scale-98"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500 transition-colors duration-200",
                      label: "text-slate-600 font-medium"
                    }}
                  >
                    All
                  </Radio>
                </RadioGroup>
              </div>

              {/* Region Selection */}
              <div className="space-y-3 bg-slate-50/80 p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2.5">
                    <i className="ri-map-pin-line text-blue-600"></i>
                    Region Selection
                  </label>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={onAddRegionClick}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200 ease-out hover:scale-102 active:scale-98"
                  >
                    <span className="flex items-center gap-1.5">
                      <i className="ri-add-circle-line"></i>
                      Add New
                    </span>
                  </Button>
                </div>
                <Select
                  label="Select Region"
                  placeholder="Choose a region"
                  selectedKeys={[options.region]}
                  onChange={(e) => setOptions(prev => ({ ...prev, region: e.target.value }))}
                  variant="bordered"
                  classNames={{
                    base: "w-full transition-all duration-200",
                    trigger: "bg-white hover:bg-blue-50 transition-colors duration-200",
                    listbox: "bg-white rounded-lg transition-transform duration-200"
                  }}
                >
                  {regions.map((region: Region) => (
                    <SelectItem 
                      key={region.pinyin} 
                      textValue={`${region.name} (${region.pinyin})`}
                      className="rounded-lg transition-all duration-200 data-[selected=true]:bg-blue-200 data-[selected=true]:border data-[selected=true]:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{region.name} ({region.pinyin})</span>
                        <span className="text-xs text-slate-500 mt-0.5">{region.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <Divider className="my-2 opacity-70" />

              {/* Numeric Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  type="number"
                  label="Total Questions"
                  value={options.totalCount.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, totalCount: parseInt(e.target.value) }))}
                  min={1}
                  variant="bordered"
                  labelPlacement="outside"
                  startContent={
                    <i className="ri-question-line"></i>
                  }
                  className="w-full group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 transition-all duration-200 ease-out group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow-md group-hover:translate-y-[-2px] group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 group-active:translate-y-[1px]",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
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
                  startContent={
                    <i className="ri-robot-2-line"></i>
                  }
                  className="w-full group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 transition-all duration-200 ease-out group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow-md group-hover:translate-y-[-2px] group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 group-active:translate-y-[1px]",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
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
                  startContent={
                    <i className="ri-stack-line"></i>
                  }
                  className="w-full group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 transition-all duration-200 ease-out group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow-md group-hover:translate-y-[-2px] group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 group-active:translate-y-[1px]",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
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
                  startContent={
                    <i className="ri-restart-line"></i>
                  }
                  className="w-full group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 transition-all duration-200 ease-out group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow-md group-hover:translate-y-[-2px] group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 group-active:translate-y-[1px]",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
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
                  startContent={
                    <i className="ri-layout-grid-line"></i>
                  }
                  className="w-full group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 transition-all duration-200 ease-out group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow-md group-hover:translate-y-[-2px] group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 group-active:translate-y-[1px]",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
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
                  startContent={
                    <i className="ri-time-line"></i>
                  }
                  className="w-full group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 transition-all duration-200 ease-out group-hover:border-blue-300 group-hover:bg-blue-50/30 group-hover:shadow-md group-hover:translate-y-[-2px] group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100 group-active:translate-y-[1px]",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
                  }}
                />
              </div>

              {/* Submit Button */}
              <Button
                type={isRunning ? "button" : "submit"}
                onPress={isRunning ? handleStop : undefined}
                color={isRunning ? "danger" : "primary"}
                className={`w-full font-medium mt-8 shadow-md transition-all duration-300 ease-out rounded-xl py-6 ${
                  isRunning 
                  ? 'animate-pulse bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg hover:shadow-red-200/50' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:shadow-blue-200/50 hover:translate-y-[-2px] active:translate-y-[1px]'
                }`}
                size="lg"
                variant={isRunning ? "solid" : "solid"}
              >
                <span className="flex items-center justify-center gap-2">
                  {isRunning ? (
                    <>
                      <i className="ri-stop-fill"></i>
                      Stop Generation
                    </>
                  ) : (
                    <>
                      <i className="ri-play-fill"></i>
                      Start Generation
                    </>
                  )}
                </span>
              </Button>
            </form>
          </ScrollShadow>
        </CardBody>
      </Card>
    </div>
  );
} 