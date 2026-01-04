/// <reference types="nativewind/types" />
import "./global.css";
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { auth } from './src/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      Alert.alert('Success', `Welcome, ${userCredential.user.email}`);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-white text-2xl font-bold mb-4">Welcome Back!</Text>
        <Text className="text-slate-400 mb-8">{user.email}</Text>
        <TouchableOpacity
          className="bg-red-600 px-6 py-3 rounded-full"
          onPress={() => setUser(null)}
        >
          <Text className="text-white font-semibold">Sign Out</Text>
        </TouchableOpacity>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="w-full max-w-sm">
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-indigo-600 rounded-2xl items-center justify-center mb-4 transform rotate-3">
            <Text className="text-white text-4xl font-bold">E</Text>
          </View>
          <Text className="text-3xl font-bold text-white tracking-tight">EduProgress</Text>
          <Text className="text-slate-400 mt-2">Sign in to continue</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-slate-300 font-medium mb-2 ml-1">Email</Text>
            <TextInput
              className="bg-slate-900 text-white border border-slate-700 rounded-xl px-4 py-4 text-base"
              placeholder="name@school.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mt-4">
            <Text className="text-slate-300 font-medium mb-2 ml-1">Password</Text>
            <TextInput
              className="bg-slate-900 text-white border border-slate-700 rounded-xl px-4 py-4 text-base"
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            className="bg-indigo-600 rounded-xl py-4 mt-8 items-center justify-center shadow-lg shadow-indigo-500/20"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}
