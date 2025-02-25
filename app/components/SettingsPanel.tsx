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
    <div className="w-full lg:w-[480px] lg:min-w-[480px] flex-shrink-0 animate-in fade-in duration-500">
      <Card className="h-full rounded-2xl border border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardHeader className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className="ri-settings-3-line text-blue-500"></i>
            Generation Settings
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          <ScrollShadow className="h-[calc(100vh-200px)] px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-7 py-5">
              {/* Operation Mode */}
              <div className="space-y-3 bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl shadow-sm border border-slate-100">
                <label id="mode-label" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <i className="ri-list-settings-line text-blue-500"></i>
                  Operation Mode
                </label>
                <RadioGroup
                  value={options.mode}
                  onValueChange={(value) => setOptions(prev => ({ ...prev, mode: value as GenerationOptions['mode'] }))}
                  orientation="horizontal"
                  classNames={{
                    wrapper: "gap-6"
                  }}
                  aria-labelledby="mode-label"
                >
                  <Radio 
                    value="questions" 
                    className="hover:scale-105 transition-all duration-300"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500",
                      label: "text-slate-700 font-medium",
                      control: "data-[selected=true]:bg-blue-500 data-[selected=true]:text-white"
                    }}
                  >
                    Questions
                  </Radio>
                  <Radio 
                    value="answers" 
                    className="hover:scale-105 transition-all duration-300"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500",
                      label: "text-slate-700 font-medium",
                      control: "data-[selected=true]:bg-blue-500 data-[selected=true]:text-white"
                    }}
                  >
                    Answers
                  </Radio>
                  <Radio 
                    value="all" 
                    className="hover:scale-105 transition-all duration-300"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500",
                      label: "text-slate-700 font-medium",
                      control: "data-[selected=true]:bg-blue-500 data-[selected=true]:text-white"
                    }}
                  >
                    All
                  </Radio>
                </RadioGroup>
              </div>

              {/* Region Selection */}
              <div className="space-y-3 bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <i className="ri-earth-line"></i>
                    Region Selection
                  </label>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={onAddRegionClick}
                  >
                    <span className="flex items-center gap-1">
                      <i className="ri-add-line"></i>
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
                    base: "w-full",
                    trigger: "bg-white",
                    listbox: "bg-white rounded-lg"
                  }}
                >
                  {regions.map((region: Region) => (
                    <SelectItem 
                      key={region.pinyin} 
                      textValue={`${region.name} (${region.pinyin})`}
                      className="rounded-lg data-[selected=true]:bg-blue-200 data-[selected=true]:border data-[selected=true]:border-blue-300"
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
                    <i className="ri-questionnaire-line"></i>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
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
                    <i className="ri-group-line"></i>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
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
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
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
                    <i className="ri-repeat-line"></i>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
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
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
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
                    <i className="ri-timer-line"></i>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
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
                className={`w-full font-medium mt-8 shadow-md transition-all duration-500 rounded-xl py-6 ${
                  isRunning 
                  ? 'animate-pulse bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-200' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-blue-200'
                }`}
                size="lg"
                variant={isRunning ? "solid" : "solid"}
              >
                <span className="flex items-center justify-center gap-2">
                  {isRunning ? (
                    <>
                      <i className="ri-stop-circle-line"></i>
                      Stop Generation
                    </>
                  ) : (
                    <>
                      <i className="ri-play-circle-line"></i>
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