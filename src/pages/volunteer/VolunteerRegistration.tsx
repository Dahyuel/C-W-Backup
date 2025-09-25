1. Fix Signup Flow

After a user signs up:

const { data: { user }, error } = await supabase.auth.signUp({
  email,
  password,
});

if (user) {
  // Insert profile row tied to this user
  const { error: profileError } = await supabase
    .from("users_profiles")
    .insert({
      id: user.id,   // 👈 must match auth.users.id
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      role: "volunteer", // or attendee, etc.
    });

  if (profileError) console.error("Profile insert error:", profileError);
}